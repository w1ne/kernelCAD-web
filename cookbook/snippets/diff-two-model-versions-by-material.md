---
id: diff-two-model-versions-by-material
title: Find out what material changed between two versions of a part
tags: [diff, parameter, hole, cutout, plate]
keywords:
  - what changed between two versions
  - added removed volume
  - diff_geometry
  - material level diff
  - did the edit add or remove material
  - topology changed verdict
  - resized verdict
  - parameter sweep diff
  - compare two scripts geometrically
  - surface deviation between revisions
when_to_use: >-
  You edited a script and need to know what physically changed, not just that
  something did. A signed volume delta is ambiguous — a boss that grew and a
  pocket that deepened report the same magnitude, and a part that only moved
  reports zero. Call diff_geometry({ baseFile, params }) to re-lower the SAME
  script with different param() values, or diff_geometry({ baseFile, file }) to
  compare two separate scripts. Per matched body you get addedMm3 =
  volume(revised-base), removedMm3 = volume(base-revised), commonMm3, exact
  bbox/face/edge/hole-count deltas, a surface deviation, and a verdict —
  identical | moved | resized | topology-changed. Branch on the verdict; quote
  the numbers. Author the part with named params and named features (as below)
  so both the override form and the report read cleanly. Reach for this when
  diff_scripts sets deeperDiffAvailable, instead of re-rendering and eyeballing.
---

```typescript
const plateT = param('plateT', 6, { min: 3, max: 20 });
const boltDia = param('boltDia', 5, { min: 3, max: 10 });
const addCablePort = param('addCablePort', true);

// Face-relative features resolve against the face as it exists at that
// moment, so cut the port BEFORE the holes: otherwise changing boltDia
// nudges the port and the diff reports motion that is not a design change.
return box(80, 50, plateT)
  .cutout(
    path().moveTo(-9, -6).lineTo(9, -6).lineTo(9, 6).lineTo(-9, 6).close(),
    { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort },
  )
  .holes('top', {
    positions: [{ u: -30, v: -18 }, { u: 30, v: -18 }],
    diameter: boltDia,
    depth: 'through',
    name: 'mountBolts',
  });
```
