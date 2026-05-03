# Task: Tilted box with chamfered top edges

Build a wedge by tilting a rectangular box about the X axis, then chamfer all edges of what was the box's top face before rotation.

The script must accept these parameters (verbatim — names and units matter):

```typescript
const w = param("Width", 40, { unit: 'mm', min: 10, max: 100 });
const d = param("Depth", 30, { unit: 'mm', min: 10, max: 100 });
const h = param("Height", 20, { unit: 'mm', min: 5, max: 60 });
const tilt = param("Tilt", 30, { unit: 'deg', min: 5, max: 60 });
const cd = param("Chamfer Distance", 1.5, { unit: 'mm', min: 0.2, max: 5 });
```

Functional requirements:

- The base shape is a box of dimensions `w × d × h`.
- The box is rotated about the X axis by `tilt` degrees. After rotation, the original top face is no longer the +Z face — it has been tilted.
- A chamfer of distance `cd` is applied to all four edges of what was the top face *before* rotation. The kernel tracks the face reference through the rotate, so writing `box(...).rotate([1,0,0], tilt).chamfer(cd, { face: 'top' })` resolves to the original top face's edges in the rotated body.
- Write the natural form: build the box, rotate, then chamfer the original top face.

The script must `return` a single Shape.

Use kernelCAD's primitives, transforms, and edge features. Z-up, millimetres, degrees.
