// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: []
//
// Snippet 4 — non-robotics mechanism: a scissor-jack lift arm modeled as a
// single open-chain pivot swept across its travel. The full closed-loop
// scissor jack would emit K5 (kinematic.solver.unsupported-config) — closed
// kinematic chains land in a separate slice. Here we lift the upper plate
// via a single lift arm and sweep that arm's pivot across its full travel,
// confirming no interference between the plate and the base across motion.

const arm = assembly('cookbook-scissor-jack-leg');

// Wide base plate.
const base = arm.part('base', box(120, 60, 8, true).translate(0, 0, 4));

// Lift arm — 80 mm long, raised above the base. Body extends in +X from
// its lower-local origin.
const liftArm = arm.part(
  'liftArm',
  box(80, 10, 6, true).translate(40, 0, 0),
);

// Pivot the lift arm above the base. Origin Z lifted by 50 mm. Axis +Y so
// positive rotation maps +X to -Z (right-handed); we sweep across negative
// angles, which lift the arm tip into +Z (up and away from the base).
base.connector('pivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [-30, 0, 50] }, axis: [0, 1, 0] });
liftArm.connector('pivotAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('pivot', 'base.pivotAxis', 'liftArm.pivotAxis', 'revolute', { limitsDeg: [-60, 0] });

// Sweep at 1° step gives 61 samples (well above the 36-sample safe floor).
const r = await kinematic.checkSweptCollision(arm, {
  joint: 'pivot',
  range: [-60, 0, 1],
});
if (r.source !== 'local') throw new Error('source !== local');
if (!r.ok) {
  const codes = r.diagnostics.map((d) => d.code).join(',');
  throw new Error(`expected clean sweep; ok=false; codes=${codes}`);
}
if (r.collidingPoses.length !== 0)
  throw new Error(`expected zero collisions; got ${r.collidingPoses.length}`);

return arm.solvedModel({ pivot: -30 });
