# Typical use case U10: twisted vase

> Twisted hexagonal vase, 180 mm tall, 90 mm across at the base widening to
> 110 mm, 60° twist, 2 mm wall, closed bottom, for vase-mode printing.

"Across" is corner to corner. The base hexagon has a corner on +X; the top
one is turned 60° and 110 mm across, and the twist grows evenly with height.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid, bottom at z = 0, 180 mm tall.
- Base 90 mm across corners with a corner on +X; top 110 mm across corners
  with a corner on +X (turned 60°).
- The twist is real: at mid-height the section is turned 30°, so there is
  material out at a corner at 30° where an untwisted vase has a flat.
- 2 mm wall: at z = 3, 90 and 170 the section is a hexagonal ring whose area
  matches a 2 mm wall (±2%); a 2 mm closed bottom; open at the top.
- STEP re-imports as one solid, STL is watertight, 3MF has the part.

Return a single Shape.
