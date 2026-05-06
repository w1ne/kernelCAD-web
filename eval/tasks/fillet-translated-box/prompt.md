# Task: Filleted box at offset

Build a rectangular box positioned at a given offset, with all of its top edges filleted.

The script must accept these parameters (verbatim — names matter):

```typescript
const w = param('width', 40, { min: 10, max: 100 });
const h = param('height', 30, { min: 10, max: 100 });
const t = param('thickness', 10, { min: 2, max: 30 });
const ox = param('offsetX', 5);
const oy = param('offsetY', 7);
const r = param('filletRadius', 2, { min: 0.5, max: 5 });
```

Functional requirements:

- The shape is a single solid box of dimensions `w × h × t`.
- The box is positioned so that its corner closest to the origin sits at `(ox, oy, 0)`.
- All four edges of the box's top face (the face whose normal points in +Z before any transform) are filleted with radius `r`.
- The fillet must reference the original top face — write the natural form `box(...).translate(...).fillet(...)`. The kernel tracks the face reference through the translate.

The script must `return` a single Shape.

Use kernelCAD's primitives, transforms, and edge features. Z-up, millimetres, degrees.
