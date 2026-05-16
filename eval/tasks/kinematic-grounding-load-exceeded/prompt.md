# Task: Joint Load Exceeded Demonstration (Gate 3)

Build an assembly that deliberately demonstrates Gate 3
(`assembly.joint.load-exceeded`) firing on a `revolute` mate whose declared
`maxLoad.torque` is exceeded by the static torque produced by an applied
external force on a lever arm.

Functional requirements:

- Two `box(10, 10, 10)` parts: `a` placed at world `[50, 0, 0]` (lever arm
  end), `b` placed at world `[0, 0, 0]` (mount).
- Place an `axis`-type vec3-origin connector on each part so the joint
  world origin lands at `[0, 0, 0]` (connector on `a` at part-local
  `[-50, 0, 0]`, connector on `b` at part-local `[0, 0, 0]`), both with
  axis `[0, 0, 1]`.
- Declare a `revolute` mate joining the two connectors with
  `limitsDeg: [-10, 10]`.
- Set `maxLoad: { torque: 5 }` (N·m) on the mate record. v0.7.5 does not yet
  expose a public `arm.mate(..., { maxLoad })` opt, so patch via the
  `arm.__mates() as MateRecord[]` accessor.
- Call `arm.solvedModel({}, { validate: 'warn', externalLoads: { a: { force: [0, 0, -100] } } })`.
  The 100 N force at a 50 mm lever arm produces 5000 N·mm = 5 N·m at the
  joint — which equals the cap. Use 200 N (10 N·m, double the cap) to
  trip the gate cleanly.
- Assert (via a thrown error if the assertion fails) that `scene.warnings`
  contains a diagnostic with code `'assembly.joint.load-exceeded'`. Return
  the scene.

The script must evaluate cleanly: a clean evaluate means the gate fired as
intended.

Z-up, millimetres, degrees, Newtons.
