# Typical use case U7: 3-axis robot arm

> Simple 3-axis desktop robot arm: rotating base, shoulder, elbow; links
> 120 mm and 100 mm; hobby servo pockets (SG90-size); revolute joints with
> limits. Export URDF.

Parts: `base`, `rotor`, `upper-arm`, `forearm`, and one SG90-size servo per
joint (`base-yaw-servo`, `shoulder-servo`, `elbow-servo`) fastened to its
parent link. Pass criteria (the harness checks each one, ±0.1 mm):

- Seven parts, each one closed, valid solid; no two parts overlap in the rest
  pose.
- Rest pose: base on z = 0, upper arm 120 mm long (x = 0…120), forearm
  100 mm long (x = 120…220).
- Three revolute mates with limits: `base-yaw` −90…90°, `shoulder` −10…20°,
  `elbow` −100…10°.
- An SG90-size servo pocket (24 × 13 × 9 mm) in the base.
- `evaluate_script` with the mechanism gate on reports the mechanism real.
- URDF exports with seven links and the three revolute joints with their
  limits; STEP re-imports as seven solids; STL is watertight.

End with `return arm.solvedModel(...)`.
