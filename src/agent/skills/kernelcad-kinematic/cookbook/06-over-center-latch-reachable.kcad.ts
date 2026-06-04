// expected: []
//
// Snippet 6 — non-robotics mechanism: an over-center latch driving a
// locking-pin target with `checkReachable`. The latch is modeled as a
// 3-revolute-joint chain (lever → drive arm → pin carrier). The locking-pin
// engagement target lives at a known nearby coordinate; we ask the IK
// whether the latch can reach it. Then we re-ask with a clearly out-of-reach
// target and assert K3 fires.

const arm = assembly('cookbook-over-center-latch');

const baseH = 30;
const L1 = 80;
const L2 = 60;
const L3 = 40;

// Pivot mount on the housing.
const housing = arm.part('housing', box(40, 40, baseH, true).translate(0, 0, baseH / 2));

// Lever the user pushes — long enough to give an over-center mechanical
// advantage. Body extends in +X from its leverPivot origin (lever-local x=0).
// Lifted in +Z so it clears the housing at zero pose.
const lever = arm.part('lever', box(L1 - 10, 10, 8, true).translate(L1 / 2, 0, 10));

// Drive arm — pin carrier swings off the lever's distal end. Body sits
// further +Z so the drive arm clears the lever at zero pose.
const drive = arm.part('drive', box(L2 - 10, 8, 8, true).translate(L2 / 2, 0, 12));

// Locking pin — extends in +X from the drive's distal end. Lifted further
// so it clears both the lever and drive at zero pose.
const pin = arm.part('pin', box(L3 - 10, 6, 6, true).translate(L3 / 2, 0, 12));

housing.connector('leverPivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, baseH + 10] }, axis: [0, 1, 0] });
lever.connector('leverPivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('leverPivot', 'housing.leverPivotAxis', 'lever.leverPivotAxis', 'revolute', { limitsDeg: [-90, 90] });

lever.connector('drivePivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [L1, 0, 0] }, axis: [0, 1, 0] });
drive.connector('drivePivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('drivePivot', 'lever.drivePivotAxis', 'drive.drivePivotAxis', 'revolute', { limitsDeg: [-160, 160] });

drive.connector('pinPivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [L2, 0, 0] }, axis: [0, 1, 0] });
pin.connector('pinPivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('pinPivot', 'drive.pinPivotAxis', 'pin.pinPivotAxis', 'revolute', { limitsDeg: [-160, 160] });

// Reachable target — at zero pose the pin tip sits at housing-local
// (L1+L2+L3, 0, baseH). Aim for an in-workspace point that needs the chain
// to bend at one or two joints.
const reachable = await kinematic.checkReachable(arm, {
  tipLink: 'pin',
  target: { position: [100, 0, 80] },
  preferSolver: 'numeric',
});
if (reachable.source !== 'local') throw new Error('reachable: source !== local');
if (!reachable.ok) {
  const codes = reachable.diagnostics.map((d) => d.code).join(',');
  throw new Error(`reachable: expected ok=true; codes=${codes}`);
}
if (!reachable.pose) throw new Error('reachable: pose missing on success');

// Unreachable target — 5000 mm out. K3 fires; pose is undefined.
const unreachable = await kinematic.checkReachable(arm, {
  tipLink: 'pin',
  target: { position: [5000, 0, 0] },
});
if (unreachable.ok) throw new Error('unreachable: expected ok=false');
const k3 = unreachable.diagnostics.some((d) => d.code === 'kinematic.unreachable');
if (!k3) throw new Error('unreachable: expected K3 kinematic.unreachable');

return arm.solvedModel({ leverPivot: 0, drivePivot: 0, pinPivot: 0 });
