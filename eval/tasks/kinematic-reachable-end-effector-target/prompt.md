# Task: End-Effector Reachability on a 6-DOF Spherical-Wrist Arm

Build a 6-DOF spherical-wrist arm and verify reachability for one in-workspace
target (`ok: true`) and one out-of-reach target (`ok: false`, K3 fires).

Functional requirements:

- Six revolute joints in the order: `shoulderYaw` (+Z) →
  `shoulderPitch` (+Y) → `elbowPitch` (+Y) → `wristYaw` (+X) →
  `wristPitch` (+Y) → `wristRoll` (+X). The last three joint origins
  coincide at the wrist center (the spherical-wrist condition that lets the
  closed-form analytical solver dispatch).
- Reasonable upper/lower-arm lengths (~150–200 mm). Stubby link bodies so
  the zero-pose interference gate stays clean.
- A reachable target at world `[250, 100, 200]`. Assert (via thrown error
  if the assertion fails) that `kinematic.checkReachable` returns
  `ok: true` with a defined `pose`.
- An out-of-reach target at world `[5000, 0, 0]`. Force the numeric path
  with `preferSolver: 'numeric'`. Assert the result is `ok: false` and
  carries a `kinematic.unreachable` (K3) diagnostic.
- Return `arm.solvedModel({...zero pose...})` so the harness's default
  interference gate stays clean.
