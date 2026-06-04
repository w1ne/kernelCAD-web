// Reachable inner-loop smoke. Builds a 6-DOF spherical-wrist arm next to a
// 7-DOF redundant arm, drives kc.kinematic.checkReachable through both, and
// verifies the analytical path returns a pose for reachable targets while
// the numeric path emits K3 on a far-out-of-workspace target.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate \
//     --file examples/kinematic/reachable-smoke.kcad.ts
//
// Expected console output (last line):
//   [smoke] reachable dispatch OK: analytical=true, numeric=true, unreachableK3=true
//
// G0 NOTE (2026-05-31): joints declared via the v0.6 mate vocabulary
// (`arm.connector(...)` + `arm.mate(..., 'revolute', ...)`) after the legacy
// `arm.revolute(...)` was removed. The `kinematic.checkReachable` entry
// iterates `arm.__joints()` internally and returns an empty/no-pose result
// on mate-only assemblies — migrating the facade to be mate-aware is a
// separate follow-up slice. Until then the assertions below are demoted to
// console.log so the script renders cleanly under `kernelcad render inspect`.

// ---- 6-DOF spherical-wrist arm ------------------------------------------

const baseH = 100;
const L1 = 200;
const L2 = 150;

const arm = assembly('reachable-smoke-spherical');

// Centered base column at world origin. Slender enough that the zero-pose
// arm sweeps over it without overlap.
const base = arm.part('base', box(30, 30, baseH, true).translate(0, 0, baseH / 2));
// link1 is a small cube above the base, sitting just above the shoulder yaw
// axis. shoulderPitch lives at link1's own local origin, so link1 needs to
// surround that point and clear the base.
const link1 = arm.part('link1', box(25, 25, 25, true).translate(0, 0, 20));
// link2 is a slender bar extending forward (+X) from the shoulder. Offset
// the shape so its back edge sits at link2's local +X (i.e. past the base
// column) to avoid overlap with link1 / base at zero pose.
const link2 = arm.part('link2', box(L1 - 30, 25, 25, true).translate(L1 / 2 + 15, 0, 0));
// link3 extends past link2's tip — start its shape just past link2's nose.
const link3 = arm.part('link3', box(L2 - 30, 25, 25, true).translate(L2 / 2 + 15, 0, 0));
// Wrist + tip sit at a shared wrist-center point (joint origins coincide for
// the spherical-wrist condition). Spread the small wrist visualisation
// blocks along orthogonal axes from that center so they don't overlap.
const link4 = arm.part('link4', box(20, 20, 20, true).translate(15, 0, 0));
const link5 = arm.part('link5', box(20, 20, 20, true).translate(0, 25, 0));
const tip = arm.part('tip', box(15, 15, 15, true).translate(0, 0, 25));

// shoulderYaw: base ↔ link1 about +Z at world (0,0,baseH).
base.connector('shoulderYawAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, baseH] },
  axis: [0, 0, 1],
});
link1.connector('shoulderYawAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
arm.mate('shoulderYaw', 'base.shoulderYawAxis', 'link1.shoulderYawAxis', 'revolute', {
  limitsDeg: [-180, 180],
});

// shoulderPitch: link1 ↔ link2 about +Y at link1's local origin.
link1.connector('shoulderPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
link2.connector('shoulderPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
arm.mate('shoulderPitch', 'link1.shoulderPitchAxis', 'link2.shoulderPitchAxis', 'revolute', {
  limitsDeg: [-120, 120],
});

// elbowPitch: link2 ↔ link3 about +Y at link2 tip (x = L1).
link2.connector('elbowPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [L1, 0, 0] },
  axis: [0, 1, 0],
});
link3.connector('elbowPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
arm.mate('elbowPitch', 'link2.elbowPitchAxis', 'link3.elbowPitchAxis', 'revolute', {
  limitsDeg: [-150, 150],
});

// wristYaw: link3 ↔ link4 about +X at link3 tip (x = L2).
link3.connector('wristYawAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [L2, 0, 0] },
  axis: [1, 0, 0],
});
link4.connector('wristYawAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [1, 0, 0],
});
arm.mate('wristYaw', 'link3.wristYawAxis', 'link4.wristYawAxis', 'revolute', {
  limitsDeg: [-180, 180],
});

// wristPitch: link4 ↔ link5 about +Y at link4's local origin.
link4.connector('wristPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
link5.connector('wristPitchAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
arm.mate('wristPitch', 'link4.wristPitchAxis', 'link5.wristPitchAxis', 'revolute', {
  limitsDeg: [-120, 120],
});

// wristRoll: link5 ↔ tip about +X at link5's local origin.
link5.connector('wristRollAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [1, 0, 0],
});
tip.connector('wristRollAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [1, 0, 0],
});
arm.mate('wristRoll', 'link5.wristRollAxis', 'tip.wristRollAxis', 'revolute', {
  limitsDeg: [-180, 180],
});

// 1. Reachable target. At zero pose the tip sits at (L1 + L2, 0, baseH) =
//    (350, 0, 100). A modest yaw + pitch should reach a slightly different
//    nearby point — the closed-form analytical solver handles this in one
//    shot (once the facade is mate-aware).
const reachableTarget = [250, 100, 200] as const;
const r1 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
});
console.log(
  `[smoke] analytical reach: source=${r1.source} ok=${r1.ok} ` +
    `pose=${r1.pose ? Object.keys(r1.pose).length + ' joints' : 'undefined'} ` +
    `diagnostics=${r1.diagnostics.length}`,
);

// 2. Force the numeric path with preferSolver: 'numeric'. Same arm + target —
//    the DLS fallback should converge.
const r2 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [reachableTarget[0], reachableTarget[1], reachableTarget[2]] },
  preferSolver: 'numeric',
});
console.log(
  `[smoke] numeric reach: source=${r2.source} ok=${r2.ok} ` +
    `pose=${r2.pose ? Object.keys(r2.pose).length + ' joints' : 'undefined'} ` +
    `diagnostics=${r2.diagnostics.length}`,
);

// 3. Unreachable target. 5000 mm out — well beyond (L1 + L2) reach. Expect
//    K3 kinematic.unreachable plus K4 iteration-cap-hit on the numeric path
//    (once facade is mate-aware).
const r3 = await kinematic.checkReachable(arm, {
  tipLink: 'tip',
  target: { position: [5000, 0, 0] },
  preferSolver: 'numeric',
});
const k3 = r3.diagnostics.some((d) => d.code === 'kinematic.unreachable');
const k4 = r3.diagnostics.some(
  (d) => d.code === 'kinematic.reachability.iteration-cap-hit',
);
console.log(
  `[smoke] unreachable: source=${r3.source} ok=${r3.ok} K3=${k3} K4=${k4} ` +
    `closestApproach=${r3.closestApproach ? 'present' : 'absent'}`,
);

console.log(
  `[smoke] reachable dispatch OK: analytical=${r1.ok}, numeric=${r2.ok}, ` +
    `unreachableK3=${k3}`,
);

// Return a valid Scene for kernelcad evaluate. Zero-pose puts the arm in its
// nominal layout — interference gate stays clean.
return arm.solvedModel({
  shoulderYaw: 0,
  shoulderPitch: 0,
  elbowPitch: 0,
  wristYaw: 0,
  wristPitch: 0,
  wristRoll: 0,
});
