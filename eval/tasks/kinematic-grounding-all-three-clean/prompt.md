# Task: Clean Assembly Under All Three Kinematic-Grounding Gates

Build a small two-mate assembly that passes all three v0.7.5 kinematic-
grounding gates: matched mounting holes on the fastened mate (Gate 1),
joint-axis bound to both parts' BREP on the revolute mate (Gate 2), and
no `maxLoad`/`externalLoads` violation (Gate 3 — declare neither, or
declare a `maxLoad` that comfortably covers any declared `externalLoads`).

Functional requirements:

- A `revolute` mate between two parts whose connector axis line passes
  through both bodies (e.g. `box(10, 10, 10)` at world `[0, 0, 0]` and a
  second `box(10, 10, 10)` at world `[10, 0, 0]`, connectors centred on
  the shared face at world `[10, 5, 5]` with axis `[1, 0, 0]`).
- A `fastened` mate between two parts whose bound faces expose matching
  Ø5 mm through-holes (use topology-bound face-center connectors).
- Call `arm.solvedModel({})` (default `validate` mode picks up
  `'error'` from `KERNELCAD_VALIDATE_DEFAULT` under `kernelcad evaluate`).
  Equivalent: `arm.solvedModel({}, { validate: 'error' })`.

The script must evaluate cleanly: none of the three kinematic-grounding
diagnostic codes (`assembly.mounting-hole.mismatch`,
`assembly.joint-axis.unbound`, `assembly.joint.load-exceeded`) should
fire.

Z-up, millimetres, degrees.
