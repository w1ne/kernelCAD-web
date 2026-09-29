# Typical use case U4: Gridfinity bin

> Gridfinity 2×1 bin, 6 units tall (42 mm grid, 7 mm height units), with
> magnet holes in the base and one divider.

It must fit a standard Gridfinity baseplate. Pass criteria (the harness checks
each one, ±0.1 mm):

- One closed, valid solid, centred on the origin in X/Y, bottom at z = 0:
  83.5 × 41.5 mm (42·n − 0.5), 42 mm tall (6 × 7 mm).
- One foot per grid cell (cell centres x = ±21). Foot profile from the bottom:
  0.8 mm 45° chamfer, 1.8 mm straight, 2.15 mm 45° chamfer (4.75 mm), so a
  foot is 35.6 mm wide at z = 0, 37.2 mm wide on the straight and the full
  41.5 mm from z = 4.75; the feet are separate at the bottom.
- Eight blind magnet holes Ø6.5 × 2.4 mm from the bottom face, at ±13 mm
  from each cell centre.
- An open cavity with a floor above the feet, and one divider across the bin
  at x = 0.
- `dfmSpec({ minWall: 1.2 })` passes; STEP, STL and 3MF export.

Return a single Shape.
