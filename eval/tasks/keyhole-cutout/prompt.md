# Task: D-Shape Cutout (Keyhole Slot)

Make a D-shaped pocket in a plate using a custom 2D profile and `cutout`.

Functional requirements:

- Plate: 50×50×8 mm.
- One **blind** D-shaped pocket on the top face, centered at the face centroid.
- Profile: a 12 mm × 8 mm rectangle from (-6, 0) to (6, 0), bulging UP (positive v) into a half-disk via a `threePointsArc` peaking at (0, 8).
- Pocket depth: 4 mm.
- Use `target.cutout(profile, { face: 'top', depth: 4 })`.

Return the resulting plate.

Z-up, millimetres, degrees.
