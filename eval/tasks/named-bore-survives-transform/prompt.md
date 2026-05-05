# Task: Named bore wall stays addressable through transforms

Drill a named through hole, transform the result (translate + rotate), and
fillet the named bore's wall on the transformed shape. The lineage carries
the labelName + snapshot through the transform chain, so the named selector
still resolves.

Geometry:

- Plate is `40 × 40 × 10 mm`, anchored at the world origin with `top` at z=10.
- Drill one through hole at `u=0, v=0`, `diameter: 6`, named `'centerBolt'`.
- Translate the resulting plate 5mm along +X.
- Rotate 30° around the Z axis: `.rotate([0, 0, 1], 30)`.
- Apply `fillet(0.4, { face: 'centerBolt.wall' })` on the transformed plate.

The script must `return` the final shape.

This validates that slice-2's lineage carries snapshot + featureName through
the transform propagation path (`propagateTransformHistory`), so the named
selector resolves even after the geometry has moved. Z-up, millimetres,
degrees.
