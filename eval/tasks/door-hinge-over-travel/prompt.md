# Task: Door Hinge Without Over-Travel Clash

Model a door panel hinged to a wall via a revolute mate. The hinge must allow
the door to swing through its full declared travel range without clashing with
the wall at any sampled pose.

Geometry:

- **Wall**: 500 mm wide × 100 mm thick × 1000 mm tall. The wall stands on the
  ground (z = 0 at the base), with its front face (the side the door swings
  away from) defining the reference plane the door closes against.
- **Door panel**: 300 mm wide × 40 mm thick × 800 mm tall.

Mate:

- Declare one `revolute` mate named `hinge` between a connector on the wall
  and a connector on the door, with `limitsDeg: [0, 95]`.
- Pose **0°** = door closed (panel lies along the wall's front face, in the
  room).
- Pose **95°** = door fully open (panel has swung outward into the room).

Success criterion:

- **No interference at any pose in `[0, 95]`**. The reviewer samples min, mid,
  and max of the declared travel range; the door must clear the wall at every
  sample. If you place the hinge connectors so that the door's body, at
  large opening angles, sweeps back into the wall material, the review gate
  will fail.

Return `arm.solvedModel({})` (or `arm.model()`) from an `assembly(...)` so the
review harness can read the mate graph.

Z-up, millimetres, degrees.
