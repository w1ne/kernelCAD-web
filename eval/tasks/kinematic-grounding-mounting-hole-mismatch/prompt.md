# Task: Mounting-Hole Mismatch Demonstration (Gate 1)

Build an assembly that deliberately demonstrates Gate 1
(`assembly.mounting-hole.mismatch`) firing on a `fastened` mate whose two
bound faces expose holes with mismatching diameters.

Functional requirements:

- Two `box(20, 20, 5)` parts, named `a` and `b`.
- Drill a Ø5 mm through-hole at the centre of `a`'s `'top'` face.
- Drill a Ø6 mm through-hole at the centre of `b`'s `'bottom'` face.
- Place a frame-type connector on each part using a topology-bound origin
  (`{ kind: 'topology', query: { kind: 'face-center', name: '<top|bottom>' } }`).
- Declare a `fastened` mate joining the two connectors.
- Call `arm.solvedModel({}, { validate: 'warn' })` so the diagnostics flow to
  `scene.warnings` instead of throwing.
- Assert (via a thrown error if the assertion fails) that
  `scene.warnings` contains a diagnostic with code
  `'assembly.mounting-hole.mismatch'`. Return the scene.

The script must evaluate cleanly: a clean evaluate means the gate fired as
intended. A non-clean evaluate (caused by the assertion throwing, or the gate
not firing at all) means the demonstration failed.

Z-up, millimetres.
