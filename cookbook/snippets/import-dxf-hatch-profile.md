---
id: import-dxf-hatch-profile
title: Import a closed polyline boundary from a DXF HATCH
tags: [sketch, extrude, import, dxf]
keywords:
  - import a dxf hatch boundary
  - use hatch outline as a sketch
  - extrude a dxf hatch profile
when_to_use: A DXF HATCH contains one closed planar polyline boundary that should become an editable sketch and solid.
example: examples/interoperability/dxf-hatch/import-hatch-plate.kcad.ts
---

`lib.fromDXF` can read one closed polyline boundary from a planar `HATCH`
entity and return it as an ordinary `Sketch`. Straight segments and DXF bulge
arcs stay exact; fill-pattern styling is not part of the imported geometry.

```typescript
const [outline] = await lib.fromDXF('hatch-bulged-plate.dxf');
return outline.extrude(5);
```

This import path accepts a single zero-elevation XY boundary with extrusion
direction `+Z`. Multi-path hatches, edge-based paths and out-of-plane hatches
are refused so holes and islands are not converted into unrelated profiles.
See the [local verification demo](../../docs/demos/dxf-hatch-polyline-import/README.md)
for the DXF fixture, invocation and measured solid result.
