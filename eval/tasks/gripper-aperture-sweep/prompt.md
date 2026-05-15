# Task: Parallel-Jaw Gripper Aperture Sweep

Build a parallel-jaw gripper assembly whose two fingers slide apart so the
tip-to-tip aperture sweeps from 0 mm (closed) to 50 mm (open). The review
loop will sample the actuator mate's limits and read the aperture summary at
both extremes.

Functional requirements:

- One palm (base) part. The exact base dimensions are up to you; pick
  something obviously palm-shaped (e.g. 60 × 40 × 20 mm).
- Two finger parts — `left-finger` and `right-finger` — each attached to the
  palm by a **prismatic** mate that slides the finger along the X axis. The
  fingers must move in opposite X directions so a single positive stroke
  opens the gripper.
- One actuator mate declares `limitsMm: [0, 25]`. A symmetric driven mate is
  coupled to it via `arm.coupleMates(...)` so both fingers extend together
  for a single source pose. Total tip-to-tip aperture therefore sweeps from
  0 mm to 50 mm.
- Each finger must carry a `frame`-type connector named `tip` placed at the
  finger's fingertip. At source pose 0 both `tip` connectors coincide on the
  X=0 plane; at source pose 25 the tips are 50 mm apart along X.
- Return `arm.model()` from the script.

The harness will invoke `review_cad` with
`gripperAperture: { left: 'left-finger.tip', right: 'right-finger.tip' }` and
check that `minMm` lands within 1 mm of 0 and `maxMm` within 1 mm of 50.

Z-up, millimetres, degrees.
