# Task: Ordinal feature fallback — chain disambiguation without names

Drill two unnamed bolt holes through a plate and round each one's lip with a
different radius using the slice-2 ordinal selector form (`hole1`, `hole2`).

Geometry:

- Plate is `60 × 40 × 12 mm`, anchored at the world origin with `top` at z=12.
- Drill two through holes (no `name:` opt):
  - hole at `u=-20, v=0`, `diameter: 5`
  - hole at `u= 20, v=0`, `diameter: 5`
- Apply `fillet(0.4, { face: 'hole1.wall' })` — first chained hole's wall.
- Apply `fillet(0.8, { face: 'hole2.wall' })` — second chained hole's wall.

The script must `return` the final plate.

Ordinal selectors are the lazy-chain rescue: `<kind><N>.<ref>` where N is the
chain-call order among unnamed same-kind features. Use `name:` for stable
references when the chain order matters (this task verifies the fallback
itself works). Z-up, millimetres, degrees.
