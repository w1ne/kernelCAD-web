# SDF smooth-blend bracket

Build an L-bracket-style part as a smooth blend of a plate (base) and a
cylinder (vertical pin) using the `sdf.*` namespace. Use `sdf.smoothBlend`
with `k = 2 mm` so the cylinder-plate junction is a smooth fillet, not a
sharp seam. Materialize to a standard `Shape` and return it.

- Plate: `sdf.box([30, 20, 4])` (axis-aligned, centred at origin).
- Pin:   `sdf.cylinder(5, 16)` (axis +Z, centred at origin — half of it
  overlaps the plate, half rises above it).
- Blend: `sdf.smoothBlend(plate, pin, 2)`.
- Resolution: 25.

Return the materialized `Shape`. Do not apply any post-materialize
translate / rotate — the harness checks the part as built.
