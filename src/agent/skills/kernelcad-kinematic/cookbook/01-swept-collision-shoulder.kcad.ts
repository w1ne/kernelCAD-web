// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['kinematic.collision.swept']
//
// Snippet 1 — checkSweptCollision on a 2-DOF arm: find the colliding band,
// then prove the declared limit clear.
//
// A shoulder-elbow arm sits on a pedestal in front of a wall. The shoulder
// yaws in the world XY plane. A sweep range is not clamped to the mate
// limits, so the snippet sweeps the full half-turn [0°, 180°] to find where
// the arm dives into the wall: K1 fires across [120°, 180°]. The shoulder
// limit is ±110°, short of that band, and a second sweep across the limits
// is clean. Every assembly in a script is mechanism-checked at its mate
// limits, so the limit must stay inside the band the sweep proves clear.
//
// The parts are seated: the upper arm rests on the pedestal top and the
// forearm laps the side of the upper arm, so each joint has a shared face
// and each connector origin lies on it.

const WALL_FACE_X = -160;
const SHOULDER_SEAT_Z = -10; // pedestal top = upper-arm underside
const ELBOW_X = 180; // upper-local; 10 mm in from the beam end
const ELBOW_SEAT_Y = 10; // upper-arm side = forearm side

const SHOULDER_LIMITS_DEG: [number, number] = [-110, 110];

const arm = assembly('cookbook-swept-collision');

// Pedestal under the shoulder, wall on the -X side, and a floor strip that
// joins them into one solid. The wall is wide in Y so a single shoulder
// yaw is enough to clip into it.
const base = arm.part(
  'base',
  box(60, 60, 60, true).translate(0, 0, -40)
    .union(box(20, 600, 100, true).translate(WALL_FACE_X - 10, 0, -20))
    .union(box(210, 60, 10, true).translate(-75, 0, -65)),
);

// Upper-arm beam 200 mm long along its local +X. The shoulder pivot is
// 10 mm in from the back end (upper-local x = 0).
const upper = arm.part('upper', box(200, 20, 20, true).translate(90, 0, 0));

// Forearm beam 120 mm long along its local +X, beside the upper arm. The
// elbow pivot is 10 mm in from its back end. Kept at elbow = 0 in this
// snippet — we only sweep the shoulder.
const fore = arm.part('fore', box(120, 20, 20, true).translate(50, 10, 0));

base.connector('shoulderAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, SHOULDER_SEAT_Z] },
  axis: [0, 0, 1],
});
upper.connector('shoulderAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, SHOULDER_SEAT_Z] },
  axis: [0, 0, 1],
});
arm.mate('shoulder', 'base.shoulderAxis', 'upper.shoulderAxis', 'revolute', {
  limitsDeg: SHOULDER_LIMITS_DEG,
});

upper.connector('elbowAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [ELBOW_X, ELBOW_SEAT_Y, 0] },
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

// Sweep past the limit to find the band that faces the wall.
const r = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [0, 180, 5],
});

if (r.source !== 'local') throw new Error('source !== local');
if (r.ok) throw new Error('expected ok=false across the colliding band');
const k1 = r.diagnostics.some((d) => d.code === 'kinematic.collision.swept');
if (!k1) throw new Error('expected K1 kinematic.collision.swept');
if (r.collidingPoses.length !== 13)
  throw new Error(`expected 13 colliding poses; got ${r.collidingPoses.length}`);
const firstCollisionDeg = Math.min(...r.collidingPoses.map((p) => p.pose['shoulder'] ?? Infinity));
if (firstCollisionDeg !== 120)
  throw new Error(`expected the colliding band to start at 120 deg; got ${firstCollisionDeg}`);
if (firstCollisionDeg <= SHOULDER_LIMITS_DEG[1])
  throw new Error(`shoulder limit ${SHOULDER_LIMITS_DEG[1]} deg is inside the colliding band`);

// The declared travel is clear.
const clear = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [SHOULDER_LIMITS_DEG[0], SHOULDER_LIMITS_DEG[1], 5],
});
if (!clear.ok)
  throw new Error(`expected a clean sweep inside the limits; codes=${clear.diagnostics.map((d) => d.code).join(',')}`);

return arm.solvedModel({ shoulder: 0, elbow: 0 });
