# Task: Named-feature disambiguation — fillet specific bores

Drill two bolt holes through a plate and round each one's lip with a different
radius via the slice-2 `name:` opt.

Geometry:

- Plate is `60 × 40 × 12 mm`, anchored at the world origin with `top` at z=12.
- Drill two holes through the plate (`depth: 'through'`):
  - hole at `u=-20, v=0`, `diameter: 5`, named `'mountFront'`
  - hole at `u= 20, v=0`, `diameter: 5`, named `'mountBack'`
- Apply a `fillet(0.4, { face: 'mountFront.wall' })` — only the front bore's
  upper rim should be filleted.
- Apply a `fillet(0.8, { face: 'mountBack.wall' })` — only the back bore's
  upper rim should be filleted (with a larger radius).

The script must `return` the final plate.

Use kernelCAD's `target.hole(face, { ..., name: '<name>' })`. Selectors
`<name>.wall` resolve to the wall of the named bore only — not all walls.
Z-up, millimetres, degrees.
