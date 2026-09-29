---
id: shaft-and-bearing-cylindrical-mate
title: Linear shaft seated in a deep-groove ball bearing via cylindrical mate
tags: [assembly, mate, connector, catalog, shaft, bearing, parameter]
keywords:
  - shaft and bearing seat
  - 608 bearing on 8 mm shaft
  - cylindrical mate shaft axis into bearing bore
  - linear shaft catalog part
  - deep-groove ball bearing assembly
  - production shaft bearing not Boolean fuse
when_to_use: >-
  Prompt asks for a shaft in a bearing, bearing seat with shaft, or rotating
  shaft on a deep-groove ball bearing. Prefer catalog `lib.fetchPart('shaft-d8-l50')`
  + `lib.standard.bearing608()` when the parts catalog is available; this snippet
  uses BREP stand-ins so evaluate stays offline/CI-green. Mate with the 4-arg
  form `arm.mate(name, 'shaft.axis', 'bearing.inner-bore', 'cylindrical')` —
  do not Boolean-union them into one solid.
---

```typescript
const arm = assembly('shaft-bearing');
// Offline stand-ins for shaft-d8-l50 + bearing-608 (Ø8 bore, ~Ø22 OD × 7 mm).
const shaftShape = cylinder(50, 4);
const bearingShape = cylinder(7, 11).subtract(cylinder(9, 4).translate(0, 0, -1));
const shaft = arm.part('shaft', shaftShape);
const bearing = arm.part('bearing', bearingShape);
shaft.connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 25] },
  axis: [0, 0, 1],
});
bearing.connector('inner-bore', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 3.5] },
  axis: [0, 0, 1],
});
arm.mate('seat', 'shaft.axis', 'bearing.inner-bore', 'cylindrical');
return arm.model();
```
