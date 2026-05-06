# Task: Single Counterbored Hole Through a Plate

Drill one counterbored bolt hole through a flat aluminum plate.

The script must accept this parameter (verbatim — name matters):

```typescript
const boltDiam = param('boltDiam', 6, { min: 3, max: 12 });
```

Functional requirements:

- The plate is a 60×60×12 mm slab, anchored at the world origin with `top` face at z=12.
- One hole through the plate at the plate centroid (face-local u=0, v=0).
- Hole bore diameter = `boltDiam` mm.
- The hole is counterbored: the counterbore is `boltDiam + 5` mm in diameter and 4 mm deep, on the top face.
- The hole goes all the way through the plate.

The script must `return` a single Shape (the resulting plate).

Use kernelCAD's `target.hole(face, opts)` method — do NOT roll your own `subtract(cylinder)` chain. Z-up, millimetres, degrees.
