// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Swept-collision eval — 2-DOF shoulder-elbow arm whose shoulder yaws into
// a wide base wall on the -X side of the pivot. K1 fires across the
// [120°, 180°] band; the script asserts ≥12 colliding poses and the K1
// diagnostic before returning the zero-pose scene to the harness.

const arm = assembly('kinematic-swept-collision');

const base = arm.part('base', box(200, 400, 60, true).translate(-200, 0, 0));
const upper = arm.part('upper', box(200, 20, 20, true).translate(100, 0, 0));
const fore = arm.part('fore', box(100, 20, 20, true).translate(50, 0, 0));

arm.revolute('shoulder', base, upper, {
  axis: [0, 0, 1],
  origin: [0, 0, 0],
  limitsDeg: [-180, 180],
});
arm.revolute('elbow', upper, fore, {
  axis: [0, 1, 0],
  origin: [200, 0, 0],
  limitsDeg: [-90, 90],
});

const r = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [120, 180, 5],
});

if (r.source !== 'local') {
  throw new Error(`source must be 'local'; got ${r.source}`);
}
if (r.ok) {
  throw new Error('expected ok=false across the colliding [120°, 180°] band');
}
const k1 = r.diagnostics.some((d) => d.code === 'kinematic.collision.swept');
if (!k1) {
  const codes = r.diagnostics.map((d) => d.code).join(', ') || '(none)';
  throw new Error(
    `expected kinematic.collision.swept (K1) diagnostic; observed: ${codes}`,
  );
}
if (r.collidingPoses.length < 12) {
  throw new Error(
    `expected at least 12 colliding poses; got ${r.collidingPoses.length}`,
  );
}

return arm.solvedModel({ shoulder: 0, elbow: 0 });
