---
id: involute-spur-gear-pair
title: Involute spur gear mesh at module pitch
tags: [gear, involute, extrude, parameter, assembly]
keywords:
  - involute spur gear primitive spurGear module teeth pressure angle
  - spur gear pair at 20 degree pressure angle
  - module and tooth counts set the pitch-circle center distance
  - meshing pinion and gear with backlash, not trapezoid teeth
  - two meshing spur gears, gear pair, gear train, reduction ratio z2/z1
  - do not hand-build involute tooth points; spurGear and ringGear generate them
  - 3D printed gears module 1 1.5 2 with FDM backlash
when_to_use: >-
  You need a meshing involute spur gear pair (module, tooth counts, 20°
  pressure angle, face width, bore, backlash). Call `spurGearPair(...)`:
  it places both gears at centre distance (m1·z1 + m2·z2)/2, turns the
  driven gear so a tooth space faces the driver, and adds revolute mates
  with a gear-pair transmission. Each tooth is the `spurGear(...)`
  involute (trochoid root, correct undercut) as one manifold solid.
  `toothInterference` aggregates exact BREP distance over sampled poses
  and refines beside the minimum. A common volume strictly above 0.001 mm³
  sets `anyInterference` and closes `minClearanceMm`. A smaller positive
  volume does not. Zero-volume contact (common volume 0 and distance 0)
  sets `minClearanceMm` to 0 while `anyInterference` stays false. The
  0.001 mm³ floor is a fixed absolute volume for every module and face
  width: overlap volume is the transverse area times the face width, and
  similar teeth grow that area with the square of the module. It does not
  certify the gaps between samples. `withGeneratingCut` is an opt-in discrete union, not a
  continuous envelope.
---

```typescript
// spurGear( builds one involute. spurGearPair places both, the frame, and the mesh.
const pair = spurGearPair({
  module: 1,
  teeth: 20,
  drivenTeeth: 40,
  faceWidth: 6,
  backlash: 0.05,
  driverBore: 5,
  drivenBore: 8,
  name: 'involute-spur-gear-pair',
});
return pair.assembly.model();
```
