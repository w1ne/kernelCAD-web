# Task: Floating Joint Axis Demonstration (Gate 2)

Build an assembly that deliberately demonstrates Gate 2
(`assembly.joint-axis.unbound`) firing on a `revolute` mate whose axis line
floats in space, intersecting neither part's BREP.

Functional requirements:

- Two `box(10, 10, 10)` parts, `a` placed at world `[0, 0, 0]` and `b` placed
  at world `[10, 0, 0]`.
- Place an `axis`-type connector on each part using a vec3 origin lifted
  50 mm above both bodies (e.g. `[5, 5, 50]` on `a`, part-local
  `[-5, 5, 50]` on `b` so the world origin sits at `[5, 5, 50]`) with axis
  `[1, 0, 0]`.
- Declare a `revolute` mate joining the two connectors, with
  `limitsDeg: [-10, 10]`.
- Call `arm.solvedModel({}, { validate: 'warn' })` so the diagnostics flow to
  `scene.warnings` instead of throwing.
- Assert (via a thrown error if the assertion fails) that
  `scene.warnings` contains at least one diagnostic with code
  `'assembly.joint-axis.unbound'`. Return the scene.

The script must evaluate cleanly: a clean evaluate means the gate fired as
intended.

Z-up, millimetres, degrees.
