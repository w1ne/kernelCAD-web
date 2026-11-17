---
id: import-dxf-ellipse-profile
title: Import and extrude a planar ellipse from DXF
tags: [sketch, extrude]
keywords:
  - import a dxf ellipse
  - exact ellipse from dxf
  - rational nurbs profile
when_to_use: A DXF drawing contains a complete planar ellipse that should remain exact in the resulting solid.
example: examples/interoperability/dxf-ellipse/import-ellipse.kcad.ts
---

Import a full planar XY `ELLIPSE` as four exact rational NURBS segments. The
returned profile is an ordinary `Sketch`, so it can be extruded and used by
the same downstream operations as a hand-authored path.

```typescript
const [profile] = await lib.fromDXF('ellipse-profile.dxf');
return profile.extrude(5);
```

Partial ellipses and ellipses outside the XY plane are refused with a line
diagnostic. See the [local verification demo](../../docs/demos/dxf-ellipse-import/README.md)
for the fixture, invocation and measured solid result.
