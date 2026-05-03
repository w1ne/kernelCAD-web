# Task: Filleted box at offset

Build a rectangular box positioned at a given offset, with all of its top edges filleted.

The script must accept these parameters (verbatim — names and units matter):

```typescript
const w = param("Width", 40, { unit: 'mm', min: 10, max: 100 });
const h = param("Height", 30, { unit: 'mm', min: 10, max: 100 });
const t = param("Thickness", 10, { unit: 'mm', min: 2, max: 30 });
const ox = param("Offset X", 5, { unit: 'mm' });
const oy = param("Offset Y", 7, { unit: 'mm' });
const r = param("Fillet Radius", 2, { unit: 'mm', min: 0.5, max: 5 });
```

Functional requirements:

- The shape is a single solid box of dimensions `w × h × t`.
- The box is positioned so that its corner closest to the origin sits at `(ox, oy, 0)`.
- All four edges of the box's top face (the face whose normal points in +Z before any transform) are filleted with radius `r`.
- The fillet must reference the original top face — write the natural form `box(...).translate(...).fillet(...)`. The kernel tracks the face reference through the translate.

The script must `return` a single Shape.

Use kernelCAD's primitives, transforms, and edge features. Z-up, millimetres, degrees.
