---
id: import-dxf-spline-profile
title: Import an exact rational spline from DXF
tags: [sketch, extrude]
keywords:
  - import a dxf spline profile
  - rational nurbs from dxf
  - exact spline extrusion
  - clamped continuous planar control-point spline
when_to_use: A DXF profile contains a planar control-point spline that must stay exact when extruded.
example: examples/interoperability/dxf-spline/spline-profile.kcad.ts
---

Import clamped, continuous, non-periodic planar SPLINE entities with their control points,
knots and optional rational weights intact. The importer returns the profile as
an ordinary `Sketch`, so downstream sketch features work without a special
mesh or approximation path.

```typescript
const [profile] = await lib.fromDXF('spline-profile.dxf');
return profile.extrude(3);
```

Fit-point-only, periodic, discontinuous and nonplanar SPLINE entities remain explicit errors;
export their control points and knots as a continuous clamped XY spline first. DXF
`ELLIPSE` and block `INSERT` entities are also refused rather than omitted.
