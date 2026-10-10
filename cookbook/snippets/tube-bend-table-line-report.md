---
id: tube-bend-table-line-report
title: Tube bend table, cut length, mass and pressure drop
tags: [tube-routing]
keywords:
  - tube bend table
  - tube cut length
  - tube LRA rows
  - tube XYZ points
  - tube mass
  - tube pressure drop
  - bend-table export
when_to_use: >-
  You need the data a tube bender or a weight and flow estimate works from:
  corner points, length / rotation / angle rows, cut length, mass and a
  pressure-drop estimate. Give the tube a density (or a known material) and a
  flow, evaluate, and read tubes.lines in the result; export bend-table writes
  one CSV per tube. The ends here are plain points in free space; an end that
  sits on an assembly part also names it, { point, axis, part }.
---

```typescript
// A 10 mm coolant tube with three bends, routed between two plain points.
// Plain point ends carry no size, so `od` is given. `axis` points from the
// end into the tube, at both ends; with it the gate checks the end leg.
tubeSpec({});

const line = tube('coolant-1', {
  from: { point: [0, 0, 0], axis: [1, 0, 0] },
  to: { point: [250, 180, 120], axis: [0, 0, -1] },   // the tube arrives from below
  via: [
    [120, 0, 0],       // on the `from` axis
    [120, 180, 0],
    [250, 180, 0],     // on the `to` axis, under the end point
  ],
  od: 10,
  wall: 1,
  bendRadius: 30,
  system: 'coolant',
  density: 2700,                      // kg/m^3, gives massKg
  flow: { lpm: 6, fluid: 'water' },   // gives pressureDropKPa
});

// evaluate --json then reports, under tubes.lines[0]:
//   cutLength   centreline length in mm
//   xyz         corner points in the tube's own frame (first leg along +X)
//   lra         one row per bend: straight before it, plane rotation, angle
//   massKg, volumeInternalMl, pressureDropKPa
// `kernelcad export bend-table <file> -o <dir>` writes the same table to
// <dir>/coolant-1.csv.
return line;
```
