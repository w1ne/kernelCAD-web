# Typical use case U8: floor plan

> Floor plan of a 10 ft × 12 ft bedroom: 4 in walls, one 32 in door, one
> 48 in window, a queen bed and a wardrobe. I need a 2D plan drawing (PDF)
> with dimensions.

Model in millimetres (1 in = 25.4 mm), room corner at the origin, walls up
+Z. The 10 ft × 12 ft is the outside of the walls. Pass criteria (the harness
checks each one, ±0.1 mm):

- One closed, valid solid (walls, bed and wardrobe fused): 3048 × 3657.6 mm,
  2438.4 mm (8 ft) walls, 101.6 mm (4 in) thick.
- A 812.8 mm (32 in) door opening in the south wall (y = 0), x = 300…1112.8.
- A 1219.2 mm (48 in) window opening centred in the north wall, sill at
  750 mm, 1200 mm tall.
- A queen bed (1524 × 2032 mm, 60 × 80 in) centred on the north wall under
  the window, and a 1219.2 × 609.6 mm wardrobe against the west wall at
  y = 2200.
- The plan exports as a PDF drawing with the dimensions labelled in feet and
  inches (the harness adds 10'-0", 12'-0", 2'-8" door, 4'-0" window and
  4" wall on the top view), all placed clear of each other.
- STEP and STL export. A DXF of the plan (a section at 1 m) exports.

Return a single Shape.
