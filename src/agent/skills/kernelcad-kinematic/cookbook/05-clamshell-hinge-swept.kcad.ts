// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: ['kinematic.collision.swept']
//
// Snippet 5 — non-robotics mechanism: a laptop clamshell hinge. Find the
// band where the lid hits the base, then prove the declared travel clear.
//
// The base is a slab on a table, with a hinge ear at each rear corner. The
// lid pivots between the ears about an axis along the rear edge. At 0° the
// lid is closed, 2 mm above the base (the bumper gap). A sweep range is not
// clamped to the mate limits, so the snippet sweeps [-15°, 135°] to find
// where the lid is driven past closed: K1 fires across [-15°, -1°], first
// into the base and then into the table. The hinge limit is [0°, 135°],
// outside that band, and a second sweep across the limits is clean. We use
// this as a stand-in for "lid hits desk" or "lid hits keyboard" regressions
// in real hinge designs.
//
// The parts are seated: the table top touches the base underside, and the
// lid end face touches the inner face of a hinge ear, so each mate has a
// shared face and each connector origin lies on it.

const BASE_T = 12;
const LID_T = 6;
const LID_GAP = 2; // closed lid to base top
const HALF_W = 150; // lid end face = ear inner face
const HINGE_Y = -100; // rear edge of the base
const HINGE_Z = BASE_T + LID_GAP + LID_T / 2;

const HINGE_LIMITS_DEG: [number, number] = [0, 135];

const arm = assembly('cookbook-clamshell-hinge');

// Laptop base on the table, with one hinge ear outboard of each rear corner.
const base = arm.part(
  'base',
  box(300, 200, BASE_T, true).translate(0, 0, BASE_T / 2)
    .union(box(10, 20, 24, true).translate(HALF_W + 5, HINGE_Y, 12))
    .union(box(10, 20, 24, true).translate(-HALF_W - 5, HINGE_Y, 12)),
);

// Table surface under the base. The lid reaches it only if the hinge is
// driven far past closed.
const table = arm.part('table', box(400, 300, 5, true).translate(0, 0, -2.5));

// Lid, same footprint as the base and thinner, modelled with the hinge axis
// on its local X axis. Its rear face is in the plane of the axis, so the
// rear edge stays above the base top through the whole travel.
const lid = arm.part('lid', box(300, 200, LID_T, true).translate(0, 100, 0));

base.connector('tableSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
table.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('table-fastened', 'base.tableSeat', 'table.seat', 'fastened');

base.connector('hingeAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [HALF_W, HINGE_Y, HINGE_Z] },
  axis: [1, 0, 0],
});
lid.connector('hingeAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [HALF_W, 0, 0] },
  axis: [1, 0, 0],
});
arm.mate('hinge', 'base.hingeAxis', 'lid.hingeAxis', 'revolute', {
  limitsDeg: HINGE_LIMITS_DEG,
});

// Sweep past closed to find the band where the lid hits the base.
const r = await kinematic.checkSweptCollision(arm, {
  joint: 'hinge',
  range: [-15, 135, 1],
});
if (r.source !== 'local') throw new Error('source !== local');
if (r.ok) throw new Error('expected ok=false across the colliding band');
const k1 = r.diagnostics.some((d) => d.code === 'kinematic.collision.swept');
if (!k1) throw new Error('expected K1 across the negative hinge band');
if (r.collidingPoses.length !== 15)
  throw new Error(`expected 15 colliding poses; got ${r.collidingPoses.length}`);
const lastCollisionDeg = Math.max(...r.collidingPoses.map((p) => p.pose['hinge'] ?? -Infinity));
if (lastCollisionDeg !== -1)
  throw new Error(`expected the colliding band to end at -1 deg; got ${lastCollisionDeg}`);
if (lastCollisionDeg >= HINGE_LIMITS_DEG[0])
  throw new Error(`hinge limit ${HINGE_LIMITS_DEG[0]} deg is inside the colliding band`);

// The declared travel is clear.
const clear = await kinematic.checkSweptCollision(arm, {
  joint: 'hinge',
  range: [HINGE_LIMITS_DEG[0], HINGE_LIMITS_DEG[1], 1],
});
if (!clear.ok)
  throw new Error(`expected a clean sweep inside the limits; codes=${clear.diagnostics.map((d) => d.code).join(',')}`);

return arm.solvedModel({ hinge: 90 });
