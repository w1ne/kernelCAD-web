// expected: []
//
// Snippet 2 — checkReachable on a 6-DOF spherical-wrist arm.
//
// Builds a 6-DOF arm with a coincident wrist center (the spherical-wrist
// condition the closed-form analytical IK requires). Asks the IK for a
// target that lives inside the workspace. The analytical path solves in one
// shot. Then re-runs the same target with `preferSolver: 'numeric'` to drive
// the DLS path and confirm both code paths converge.

const baseH = 100;
const L1 = 200;
const L2 = 150;

const arm = assembly('cookbook-reachable-seed');

const base = arm.part('base', box(30, 30, baseH, true).translate(0, 0, baseH / 2));
const link1 = arm.part('link1', box(25, 25, 25, true).translate(0, 0, 20));
const link2 = arm.part('link2', box(L1 - 30, 25, 25, true).translate(L1 / 2 + 15, 0, 0));
const link3 = arm.part('link3', box(L2 - 30, 25, 25, true).translate(L2 / 2 + 15, 0, 0));
const link4 = arm.part('link4', box(20, 20, 20, true).translate(15, 0, 0));
const link5 = arm.part('link5', box(20, 20, 20, true).translate(0, 25, 0));
const tip = arm.part('tip', box(15, 15, 15, true).translate(0, 0, 25));

arm.revolute('shoulderYaw', base, link1, {
  axis: [0, 0, 1], origin: [0, 0, baseH], limitsDeg: [-180, 180],
});
arm.revolute('shoulderPitch', link1, link2, {
  axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-120, 120],
});
arm.revolute('elbowPitch', link2, link3, {
  axis: [0, 1, 0], origin: [L1, 0, 0], limitsDeg: [-150, 150],
});
arm.revolute('wristYaw', link3, link4, {
  axis: [1, 0, 0], origin: [L2, 0, 0], limitsDeg: [-180, 180],
});
arm.revolute('wristPitch', link4, link5, {
  axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-120, 120],
});
arm.revolute('wristRoll', link5, tip, {
  axis: [1, 0, 0], origin: [0, 0, 0], limitsDeg: [-180, 180],
});

// Target lives inside the workspace; expect a clean analytical solution.
const reachableTarget = [250, 100, 200] as const;

// Seed pose hints the numeric path toward a nearby branch; the analytical
// path ignores it (the closed-form solver returns its own branch choice).
// Values are DEGREES (kernelCAD's joint-angle convention everywhere) — a
// 17° / 11° / -11° hint, not radians. Use 0 for "no preference."
const seed = {
  shoulderYaw: 17, shoulderPitch: 11, elbowPitch: -11,
  wristYaw: 0, wristPitch: 0, wristRoll: 0,
};

const r1 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
  seed,
});
if (r1.source !== 'local') throw new Error('analytical: source !== local');
if (!r1.ok) throw new Error('analytical: expected reachable target to succeed');
if (!r1.pose) throw new Error('analytical: pose missing on success');

const r2 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
  preferSolver: 'numeric',
  seed,
});
if (!r2.ok) throw new Error('numeric: expected reachable target to succeed');
if (!r2.pose) throw new Error('numeric: pose missing on success');

return arm.solvedModel({
  shoulderYaw: 0, shoulderPitch: 0, elbowPitch: 0,
  wristYaw: 0, wristPitch: 0, wristRoll: 0,
});
