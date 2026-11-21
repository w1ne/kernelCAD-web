---
id: import-dxf-hatch-profile
title: Import closed polyline and edge boundaries, holes included, from a DXF HATCH
tags: [sketch, extrude, import, dxf]
keywords:
  - import a dxf hatch boundary
  - use hatch outline as a sketch
  - extrude a dxf hatch profile
  - dxf hatch with holes
  - hatched gasket with bolt holes from dxf
  - dxf hatch with line and arc edges
when_to_use: A DXF HATCH contains closed planar polyline or line-and-arc edge boundaries, possibly with holes or islands, that should become editable sketches and solids.
example: examples/interoperability/dxf-hatch/import-hatch-gasket.kcad.ts
---

`lib.fromDXF` reads the closed boundaries of a planar `HATCH` entity and
returns ordinary `Sketch` profiles. A boundary path can be a polyline or a
chain of line and circular-arc edges, which is what AutoCAD writes for a hatch
picked from LINE, ARC and CIRCLE geometry. A one-path HATCH, such as
`examples/interoperability/dxf-hatch/hatch-bulged-plate.dxf`, gives one
sketch. Straight segments, DXF bulge arcs and arc edges (clockwise ones
included) stay exact; fill-pattern styling is not part of the imported geometry.

A HATCH with several boundary paths declares which loops are holes. The
importer keeps that: each filled area comes back as ONE sketch whose inner
paths are holes, so one `.extrude()` gives the plate with its cut-outs. An
island inside a hole is returned as a separate sketch. The hatch style (group
code 75) decides the fill: normal (odd parity), outer, or ignore.

```typescript
// Outline, window and four bolt holes in one HATCH -> one profile.
const [gasket] = await lib.fromDXF('hatch-gasket.dxf');
return gasket.extrude(2);
```

This import path accepts zero-elevation XY boundaries with extrusion
direction `+Z`. Edges that do not join end to end, elliptic-arc and spline
edges, crossing or touching paths and out-of-plane hatches are refused rather
than guessed. `examples/interoperability/dxf-hatch/import-hatch-edge-bracket.kcad.ts`
imports an edge-path bracket plate with a slot and two round holes.
See the [local verification demo](../../docs/demos/dxf-hatch-polyline-import/README.md)
for the one-path DXF fixture, invocation and measured solid result.
