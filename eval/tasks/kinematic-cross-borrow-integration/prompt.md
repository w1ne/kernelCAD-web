# Task: Cross-Borrow Integration — Curve + Topology Refs + Swept Collision

Demonstrate three borrow chains composing in one `.kcad.ts` script: a 3D
parametric curve supplies stop positions, topology refs bind a fastener
through a named face, and the kinematic facade verifies a swept-collision
gate at one of those stops.

Functional requirements:

- Define a 3D rail curve via `nurbsCurve(controlPoints, { degree: 3 })`
  with four control points spanning a gentle S-shape ~600 mm long in X.
- Sample the curve at 8 evenly-spaced parameters via `curve.sample(7)`
  (returns 8 points: `n + 1` per the API contract). Assert the sample
  count is exactly 8.
- For one selected stop position, build a small 1-DOF arm whose base sits
  at that stop. The base part has a named `'bottom'` face; mount it to a
  rail-mount block via a `fastened` mate using a topology-bound connector
  whose origin is `{ kind: 'topology', query: { kind: 'face-center',
  name: 'bottom' } }`. This exercises the `@kc[…]` / topology-ref
  pathway.
- The arm has a single revolute shoulder joint (axis +Z) and a 200 mm
  upper-arm link. Sweep the shoulder across `[-90°, 90°]` at 5° step
  (37 samples — comfortably above the 36-sample safe floor for revolute).
- Assert in-script that:
  - The curve sample returns exactly 8 stop positions
  - `kinematic.checkSweptCollision` returns `source: 'local'`,
    `posesSampled === 37`, and `ok: true` (no collisions at the chosen
    stop)
- Return `arm.solvedModel({ shoulder: 0 })`.
