// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['kinematic.collision.swept']
//
// Snippet 1 — checkSweptCollision on a 2-DOF arm.
//
// Builds a shoulder-elbow arm next to a wide base wall. The shoulder yaws in
// the world XY plane. For shoulder angles in [120°, 180°] the upper-arm tip
// dives into the -X half-plane where the base wall lives — K1 fires across
// that band. The snippet asserts that K1 is emitted and that at least 12
// colliding poses are reported across the colliding window.

const arm = assembly('cookbook-swept-collision');

// Base wall on the -X side of the shoulder pivot. Wide in Y so a single
// shoulder yaw is enough to clip into it.
const base = arm.part('base', box(200, 400, 60, true).translate(-200, 0, 0));

// Upper-arm beam 200mm long along its local +X. Back end at the shoulder
// pivot (upper-local x = 0).
const upper = arm.part('upper', box(200, 20, 20, true).translate(100, 0, 0));

// Forearm beam 100mm long along its local +X. Kept at elbow = 0 in this
// snippet — we only sweep the shoulder.
const fore = arm.part('fore', box(100, 20, 20, true).translate(50, 0, 0));

base.connector('shoulderAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
upper.connector('shoulderAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
arm.mate('shoulder', 'base.shoulderAxis', 'upper.shoulderAxis', 'revolute', {
  limitsDeg: [-180, 180],
});

upper.connector('elbowAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [200, 0, 0] },
  axis: [0, 1, 0],
});
fore.connector('elbowAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
arm.mate('elbow', 'upper.elbowAxis', 'fore.elbowAxis', 'revolute', {
  limitsDeg: [-90, 90],
});

const r = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [120, 180, 5],
});

if (r.source !== 'local') throw new Error('source !== local');
if (r.ok) throw new Error('expected ok=false across the colliding band');
const k1 = r.diagnostics.some((d) => d.code === 'kinematic.collision.swept');
if (!k1) throw new Error('expected K1 kinematic.collision.swept');
if (r.collidingPoses.length < 12)
  throw new Error(`expected >=12 colliding poses; got ${r.collidingPoses.length}`);

return arm.solvedModel({ shoulder: 0, elbow: 0 });
