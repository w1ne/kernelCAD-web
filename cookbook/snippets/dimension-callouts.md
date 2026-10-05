---
id: dimension-callouts
title: Declare dimension callouts on the 3D viewer
tags: [dimension, callout, hole-spacing, annotation]
keywords:
  - show hole spacing in the viewer
  - label a distance on the model
  - declared dimension callout
  - measurement overlay
when_to_use: You want the viewer to show a named measurement on the model, for example the spacing between two holes or a hole diameter, by declaring it with shape.dimension() in the script. Labels are names, the viewer adds the value; open the shared link with ?dims=1 to force the callouts on.
---

```typescript
// A mounting plate with two holes; the viewer shows "hole spacing 30".
// A circular edge anchor measures to the hole centre, and the label is a
// name: the viewer appends the measured value itself.
const holeAt = (x: number, y: number) => ({
  edge: { ofCurveType: 'CIRCLE' as const, near: [x, y, 6] as [number, number, number] },
});
const plate = box(60, 40, 6)
  .holes('top', {
    positions: [{ u: -15, v: 0 }, { u: 15, v: 0 }],
    diameter: 5,
    depth: 'through',
  })
  .dimension({ kind: 'linear', from: holeAt(15, 20), to: holeAt(45, 20), label: 'hole spacing' })
  .dimension({ kind: 'diameter', edge: holeAt(15, 20).edge });
return plate;
```
