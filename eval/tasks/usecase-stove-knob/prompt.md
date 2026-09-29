# Typical use case U5: replacement knob from measurements

> Replacement knob for a stove: D-shaft 6 mm diameter with a flat at 4.5 mm,
> shaft 12 mm deep; knob 35 mm diameter, 20 mm tall, knurled grip, pointer
> mark on top.

Fit: the shaft hole is Ø6.2 mm (0.2 mm clearance), and the flat moves with it
(4.7 mm from the round side). Pass criteria (the harness checks each one,
±0.1 mm):

- One closed, valid solid: Ø35 × 20 mm, axis on Z, bottom at z = 0. The grip
  stays inside the Ø35 envelope.
- D-shaped shaft hole from the bottom, 12 mm deep: Ø6.2 round side toward −Y,
  the flat at y = +1.6.
- Knurled grip: 36 grooves every 10° around the side, 0.8 mm deep, the first
  on +X.
- Pointer mark: a groove on the top face from the centre out along +Y (the
  flat's side).
- `dfmSpec({ minWall: 1.2 })` passes; STEP, STL and 3MF export.

Return a single Shape.
