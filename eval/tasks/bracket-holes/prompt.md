# Task: Parametric L-Bracket

Build an L-shaped mounting bracket that works for different bolt sizes.

The script must accept this parameter (verbatim — name matters):

```typescript
const boltDiam = param('boltDiam', 5, { min: 3, max: 10 });
```

Functional requirements:

- The bracket is L-shaped: two perpendicular flat plates joined at a right angle.
- Each plate has a single mounting hole. Hole diameter = `boltDiam + 0.5` mm (a 0.5mm clearance fit).
- Wall thickness (the dimension across each plate's smallest face) is at least `2 * boltDiam` mm.
- Each plate is at least `3 * boltDiam` mm in width and at least `3 * boltDiam` mm in height.
- The plates are connected (a single solid, not two free-floating slabs).

The script must `return` a single Shape.

Use kernelCAD's primitives and boolean operations. Z-up, millimetres, degrees.
