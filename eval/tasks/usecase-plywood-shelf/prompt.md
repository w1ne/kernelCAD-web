# Typical use case U9: plywood shelf for a CNC

> Bookshelf from 18 mm plywood: 800 mm wide, 1200 mm tall, 300 mm deep,
> 4 shelves, dado joints. I need a cut list and DXF files of each flat part
> for a CNC.

Model each board as its own assembly part: `side-left`, `side-right`,
`bottom`, `shelf-1` … `shelf-4`, `top`. Pass criteria (the harness checks each
one, ±0.1 mm):

- Eight parts, each one closed, valid solid; together 800 × 300 × 1200 mm
  from the origin; no two parts overlap.
- Side panels 18 × 300 × 1200 mm with six dados on the inner face, 9 mm deep
  and 18 mm wide, full depth, at the board heights.
- Horizontal boards 782 × 300 × 18 mm, running into the dados (x = 9…791),
  at heights that make five equal compartments (board centres z = 9, 245.4,
  481.8, 718.2, 954.6, 1191).
- The cut list (`bom-csv`) lists 2 × side panel and 6 × board with their
  sizes.
- The DXF export gives the flat outline of every part (one layer each).
- STEP re-imports as eight solids; STL is watertight.

End with `return <assembly>.model();`.
