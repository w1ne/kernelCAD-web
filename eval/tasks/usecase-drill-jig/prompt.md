# Typical use case U12: drill jig

> Drill guide jig for drilling a hole 20 mm from the edge of an 18 mm board,
> centred on its thickness: fence that registers on the edge, guide bushing
> hole 8 mm.

The hole goes into the board's edge (a dowel-style hole), centred on the
18 mm thickness, 20 mm from the board's end. Model it in the board's frame:
the edge face is z = 0 with the board below it, the board's faces are x = 0
and x = 18, and its end is y = 0 with the board toward +Y.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid.
- Guide hole Ø8 along Z, through the guide, at x = 9 (centred on the
  thickness), y = 20 (20 mm from the end); at least 10 mm of guide length.
- The jig registers on the board: an 18 mm wide gap for the board below
  z = 0 with material hugging both faces (x < 0 and x > 18), and a fence
  across the board's end (y < 0).
- `dfmSpec({ minWall: 1.2 })` passes; STEP, STL and 3MF export.

Return a single Shape.
