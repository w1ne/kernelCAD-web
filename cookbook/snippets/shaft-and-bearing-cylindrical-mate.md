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
  shaft on a deep-groove ball bearing. Fetch catalog shaft + bearing and mate
  with the 4-arg form `arm.mate(name, 'shaft.axis', 'bearing.inner-bore',
  'cylindrical')` — do not Boolean-union them into one solid when the user
  wants a real multi-body machine element.
---

```typescript
const arm = assembly('shaft-bearing');
const shaft = await lib.fetchPart('shaft-d8-l50'); // Ø8 × 50 mm linear shaft
const bearing = await lib.standard.bearing608();   // Ø8 bore deep-groove bearing
arm.part('shaft', shaft);
arm.part('bearing', bearing);
arm.mate('seat', 'shaft.axis', 'bearing.inner-bore', 'cylindrical');
return arm.model();
```
