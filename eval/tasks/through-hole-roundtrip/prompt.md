# Task: Through-hole round-trip

Build a **100×60×5 mm aluminum plate**. Drill a **6 mm hole through it** at (0, 0) in
the top face's local frame. Return the resulting shape.

Functional requirements:

- Plate: `box(100, 60, 5)`.
- One through-hole on the top face, centered at (0, 0) in the face frame, diameter 6 mm.
- Use `Shape.hole(face, { u, v, diameter, depth: 'through' })`.
- No floor face on the bore axis (it's through).

Z-up, millimetres, degrees.
