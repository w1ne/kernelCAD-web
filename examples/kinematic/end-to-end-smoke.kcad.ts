// End-to-end smoke of the kc.kinematic.* facade. Builds a 4-DOF desktop arm
// (yaw + pitch + elbow + tool roll), then exercises all four facade entries
// in sequence, asserting the expected diagnostics fire and source: 'local'
// holds across every envelope.

const baseH = 80;
const L1 = 150;
const L2 = 120;

const arm = assembly('smoke-kinematic-desktop-arm');

const base = arm.part('base', box(40, 40, baseH, true).translate(0, 0, baseH / 2));
const link1 = arm.part('link1', box(30, 30, 30, true).translate(0, 0, 20));
const link2 = arm.part('link2', box(L1 - 30, 25, 25, true).translate(L1 / 2 + 15, 0, 0));
const link3 = arm.part('link3', box(L2 - 30, 25, 25, true).translate(L2 / 2 + 15, 0, 0));
const gripper = arm.part('gripper', box(40, 25, 25, true).translate(20, 0, 0));

arm.revolute('yaw', base, link1, {
  axis: [0, 0, 1], origin: [0, 0, baseH], limitsDeg: [-180, 180],
});
arm.revolute('shoulder', link1, link2, {
  axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-90, 90],
});
arm.revolute('elbow', link2, link3, {
  axis: [0, 1, 0], origin: [L1, 0, 0], limitsDeg: [-150, 150],
});
arm.revolute('tool', link3, gripper, {
  axis: [1, 0, 0], origin: [L2, 0, 0], limitsDeg: [-180, 180],
});

// 1. Swept-collision sweep on the shoulder.
const swept = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder', range: [-90, 90, 5],
});
if (swept.source !== 'local') throw new Error('swept: source != local');
console.log(
  `[smoke] swept: source=${swept.source} ok=${swept.ok} ` +
  `posesSampled=${swept.posesSampled} collidingPoses=${swept.collidingPoses.length}`,
);

// 2. Reachable target.
const reach = await kinematic.checkReachable(arm, {
  tipLink: 'gripper',
  target: { position: [120, 60, 120] },
});
if (reach.source !== 'local') throw new Error('reach: source != local');
console.log(
  `[smoke] reach: source=${reach.source} ok=${reach.ok} ` +
  `pose=${reach.pose ? Object.keys(reach.pose).length + ' joints' : 'undef'}`,
);

// 3. Mounting-hole consistency (no fastened mates here, expect ok=true).
const holes = await kinematic.checkMountingHoleConsistency(arm);
if (holes.source !== 'local') throw new Error('holes: source != local');
console.log(
  `[smoke] mounting-holes: source=${holes.source} ok=${holes.ok} ` +
  `mismatches=${holes.mismatches.length}`,
);

// 4. Load capacity: PLA gripper with a 50 N downward force — declares no
// crossSection, so K7 fires (beam not applicable).
const load = await kinematic.checkLoadCapacity(
  arm,
  { gripper: { force: [0, 0, -50] } },
  { materials: { gripper: { material: 'pla' } } },
);
if (load.source !== 'local') throw new Error('load: source != local');
const k7 = load.diagnostics.some((d) => d.code === 'kinematic.load.beam-not-applicable');
console.log(
  `[smoke] load: source=${load.source} elements=${load.elements.length} K7=${k7}`,
);
if (!k7) throw new Error('load: expected K7 (no crossSection declared)');

console.log('[smoke] kc.kinematic.* end-to-end dispatch OK');

return arm.solvedModel({ yaw: 0, shoulder: 0, elbow: 0, tool: 0 });
