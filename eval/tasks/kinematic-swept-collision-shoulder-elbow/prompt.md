# Task: Swept-Collision on a 2-DOF Shoulder/Elbow Arm

Build a 2-DOF assembly that deliberately collides with its own base when the
shoulder yaws into the back half-plane, then verify by calling
`kinematic.checkSweptCollision`.

Functional requirements:

- A wide base wall on the -X side of the shoulder pivot (~200×400×60 mm,
  translated to `[-200, 0, 0]`).
- An upper-arm beam ~200 mm long along its local +X, back end at the
  shoulder pivot (upper-local x = 0).
- A forearm beam ~100 mm long along its local +X, back end at the elbow
  pivot.
- A revolute `shoulder` mate from base to upper, axis +Z, origin
  `[0, 0, 0]`, limits `[-180°, 180°]`.
- A revolute `elbow` mate from upper to fore, axis +Y, origin
  `[200, 0, 0]`, limits `[-90°, 90°]`.
- Call `kinematic.checkSweptCollision(arm, { joint: 'shoulder',
  range: [120, 180, 5] })`. The colliding band should produce ≥12 colliding
  poses across `shoulder ∈ [120°, 180°]`.
- Assert (via a thrown error if the assertion fails) that the result carries
  `source: 'local'`, `ok: false`, at least one
  `kinematic.collision.swept` diagnostic, and ≥12 entries in
  `collidingPoses[]`.
- Return `arm.solvedModel({ shoulder: 0, elbow: 0 })` so the harness's
  default interference gate stays clean.
