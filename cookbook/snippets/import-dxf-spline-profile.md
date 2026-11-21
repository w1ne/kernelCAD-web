---
id: import-dxf-spline-profile
title: Import an exact rational spline from DXF
tags: [sketch, extrude]
keywords:
  - import a dxf spline profile
  - rational nurbs from dxf
  - exact spline extrusion
  - clamped continuous planar control-point spline
  - periodic closed dxf spline
  - fit-point dxf spline
when_to_use: A DXF profile contains a planar control-point spline that must stay exact when extruded.
example: examples/interoperability/dxf-spline/spline-profile.kcad.ts
---

Import continuous planar SPLINE entities with their control points, knots and
optional rational weights intact. Periodic (closed) and unclamped splines are
clamped by exact knot insertion: the curve and its parameters do not change. The importer returns the profile as
an ordinary `Sketch`, so downstream sketch features work without a special
mesh or approximation path.

```typescript
const [profile] = await lib.fromDXF('spline-profile.dxf');
return profile.extrude(3);
```

A cubic SPLINE that stores only fit points, as ezdxf `add_spline(fit_points)`
writes it, is interpolated through every fit point and its end tangents with
chord-length parameters. A closed one without end tangents becomes a smooth
(C2) periodic cubic through its fit points. The fit points are exact; the shape
between them can differ slightly from the source tool's curve.

Non-cubic fit-point-only, discontinuous and nonplanar SPLINE entities remain explicit errors,
and so does a closed SPLINE whose control net does not repeat its first `degree`
points; export control points and knots as a continuous XY spline first.
Full and partial planar DXF `ELLIPSE` entities are also preserved exactly as
rational NURBS; nonplanar ellipses are refused rather than omitted. Block
`INSERT` references are expanded in place.
