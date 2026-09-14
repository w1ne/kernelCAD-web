---
id: fdm-printability-and-print-orientation
title: Check FDM printability and choose a support-free print orientation
tags: [manufacturing, overhang, print-orientation]
keywords:
  - overhang steeper than 45 degrees needs support material
  - bridge span longer than maxBridgeMm sags
  - wall thinner than 2 x nozzle diameter
  - which way up should this print
  - rotate so the print needs no supports
  - dfmSpec process fdm buildDirection nozzleMm maxOverhangDeg
  - bed adhesion contact area and tipping risk
  - design for additive manufacturing before slicing
when_to_use: >-
  You are about to slice or send a model to an FDM printer and want to know
  first whether it prints cleanly — no unsupported overhangs, no over-long
  bridges, walls at least 2 x the nozzle, no pins or holes too small for the
  nozzle, enough bed contact, fits the printer bed. Declare
  dfmSpec({ process: 'fdm' }) and evaluate; the dfm.fdm.* diagnostics name
  the overhang area and locus, and the hint gives the axis-aligned rotation
  that minimises unsupported area ("rotate -90° about Y ... drops from 938.2
  to 0.0 mm²"). Apply it by declaring that buildDirection, which the gcode
  export also slices in. Full report per orientation via
  verify({ check: 'dfm' }) or kernelcad dfm.
---

```typescript
// Wall hook, modeled the way it hangs. As modeled (+Z up) the arm underside
// is a 40 mm cantilever and dfmSpec({ process: 'fdm' }) fails with
// dfm.fdm.overhang-unsupported. The hint recommended buildDirection '+x'
// (lie it on its side), declared below, so evaluate passes and
// export format:'gcode' slices it in that orientation.
const width = param('width', 24, { min: 10, max: 60 });
const reach = param('reach', 40, { min: 20, max: 80 });

const screwHole = (z: number) => cylinder(5, 2.25).rotateX(-90).translate(width.divide(2), 0, z);
const backPlate = box(width, 5, 70).subtract(screwHole(12)).subtract(screwHole(58));
const arm = box(width, reach, 6).translate(0, 5, 35);
const lip = box(width, 4, 12).translate(0, reach.add(1), 41);

dfmSpec({
  process: 'fdm',
  buildDirection: '+x',  // part-local axis pointing away from the bed
  nozzleMm: 0.4,         // walls < 0.8 mm, holes < 2 mm, pins < 3 mm are flagged
  maxOverhangDeg: 45,    // degrees from vertical; 90 = printing with supports
  maxBridgeMm: 10,
  printer: 'generic-fdm',
});

return backPlate.union(arm).union(lip).fillet(4, { parallel: [1, 0, 0], concave: true });
```
