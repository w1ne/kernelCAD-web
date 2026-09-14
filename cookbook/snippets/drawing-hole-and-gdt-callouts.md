---
id: drawing-hole-and-gdt-callouts
title: Standard hole/fillet/chamfer callouts and a position tolerance on a svg-drawing sheet
tags: [hole, plate, bolt, drawing, dimension, gdt, tolerance]
keywords:
  - hole callout THRU blind counterbore countersink
  - feature control frame position tolerance datum
  - dimension a hole on an engineering drawing
  - GD&T annotation svg-drawing
when_to_use: You exported a svg-drawing sheet and need standard fabrication callouts — ⌀ hole diameters with THRU/blind/counterbore/countersink, a pattern count, a fillet radius, a chamfer size, a datum letter, and a feature-control-frame tolerance — instead of only the automatic bounding-box dimensions.
---

```typescript
// Model: a plate with a counterbored hole and three plain through-holes.
const w = 80, h = 50, t = 10;
let plate = box(w, h, t);
for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]] as const) {
  plate = plate.subtract(cylinder(t + 4, 3.25).translate(x, y, -2));
}
plate = plate.subtract(cylinder(4, 6).translate(10, 10, 6)); // counterbore

// export({ target: 'model', format: 'svg-drawing', options: { annotations } })
// annotations:
// [
//   { kind: 'hole', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [10, 10, -2] },
//     through: true, counterbore: { diameter: 12, depth: 4 } },
//     // -> "⌀6.5 THRU ⌴⌀12 ▾ 4"
//   { kind: 'hole', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [70, 10, -2] },
//     through: true, count: 4 },
//     // -> "4× ⌀6.5 THRU"
//   { kind: 'fillet', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [65, 25, 18] } },
//     // -> "R<radius>"
//   { kind: 'chamfer', view: 'top', edge: { ofCurveType: 'LINE', near: [0, 0, 10] }, size: 2 },
//     // -> "2 × 45°" (leg size is author-supplied; not recoverable from a bare edge)
//   { kind: 'datum', view: 'top', face: { atZ: 0 }, label: 'A' },
//     // -> square datum-feature symbol + leader
//   { kind: 'fcf', view: 'top', edge: { ofCurveType: 'CIRCLE', near: [70, 40, -2] },
//     type: 'position', value: 0.1, datums: ['A'], modifier: '⌀' },
//     // -> feature control frame: [⌖][⌀0.1][A]
// ]
return plate;
```
