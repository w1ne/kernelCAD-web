---
id: import-dxf-ellipse-profile
title: Import and extrude planar ellipse geometry from DXF
tags: [sketch, extrude]
keywords:
  - import a dxf ellipse
  - exact ellipse from dxf
  - rational nurbs profile
when_to_use: A DXF drawing contains a full planar ellipse or an elliptical arc joined into a closed profile that should remain exact in the resulting solid.
example: examples/interoperability/dxf-ellipse/import-partial-ellipse.kcad.ts
---

Import full planar XY `ELLIPSE` entities as four exact rational NURBS segments,
or partial ellipses as exact rational NURBS arcs. An elliptical arc must join
other edges into a closed profile before `lib.fromDXF` returns it. The returned
profile is an ordinary `Sketch`, so it can be extruded and used by the same
downstream operations as a hand-authored path.

```typescript
const [profile] = await lib.fromDXF('partial-ellipse.dxf');
return profile.extrude(3);
```

Ellipses outside the XY plane are refused with a line diagnostic. See the
[local verification demo](../../docs/demos/dxf-partial-ellipse-import/README.md)
for the fixture, invocation and measured solid result.
