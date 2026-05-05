# Task: Through-Slot via Cutout + Filleted Walls

Make a rectangular slot all the way through a plate using `cutout`, then round the resulting wall lips with a single `.fillet({ face: 'wall' })` call.

Functional requirements:

- Plate: 60×40×6 mm.
- One **through** slot on the top face: 30 mm long × 6 mm wide rectangle, centered on the plate centroid (long axis along face-local u).
- Use `target.cutout(profile, { face: 'top', depth: 'through' })`.
- After the cut, fillet the cutout walls with radius 0.5 mm using `.fillet(0.5, { face: 'wall' })`.

Return the filleted plate.

Z-up, millimetres, degrees.
