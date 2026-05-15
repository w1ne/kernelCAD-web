# Task: Grid Heat-Sink Fin Array

Build a flat heat-sink base and a grid-patterned fin array unioned onto it.

Functional requirements:

- Base: 100 × 100 × 3 mm plate, anchored at origin so it spans `[0, 100] × [0, 100] × [0, 3]`.
- One source fin: 3 × 25 × 12 mm box. Translate it so its bottom face sits on the base top (z = 3) and its corner anchors at (0, 0, 3).
- Pattern the fin in a grid:
  - x direction `[1, 0, 0]`, 8 instances, spacing 12 mm.
  - y direction `[0, 1, 0]`, 3 instances, spacing 30 mm.
- Union the fin grid onto the base.

Return the heat sink.

Z-up, millimetres, degrees.
