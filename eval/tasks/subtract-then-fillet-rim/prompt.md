# Task: Plate with through-hole and filleted top rim

Build a square plate with a single concentric through-hole, with a fillet applied to all top edges (the outer perimeter and the rim of the hole, both belonging to the plate's top face after the hole is cut).

The script must accept these parameters (verbatim — names matter):

```typescript
const s = param('s', 50, { min: 20, max: 200 });
const t = param('t', 8, { min: 2, max: 30 });
const d = param('d', 12, { min: 3, max: 30 });
const r = param('r', 1.5, { min: 0.2, max: 5 });
```

Functional requirements:

- The plate is a square of side `s` and thickness `t`, sitting with its bottom face at `z = 0`.
- A single cylindrical through-hole of diameter `d` is centered laterally on the plate (at `(s/2, s/2)`) and goes through the entire thickness.
- A fillet of radius `r` is applied to every edge of the plate's top face — both the outer rectangular perimeter AND the circular rim around the hole. Both belong to the same `top` face after the subtract operation.
- Write the natural form: `box(...).subtract(cylinder(...).translate(...)).fillet(r, { face: 'top' })`. The kernel tracks the face reference through the boolean.

The script must `return` a single Shape.

Use kernelCAD's primitives, transforms, booleans, and edge features. Z-up, millimetres, degrees.
