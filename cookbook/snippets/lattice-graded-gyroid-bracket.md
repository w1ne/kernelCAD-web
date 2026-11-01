---
id: lattice-graded-gyroid-bracket
title: Lightweight printed bracket with a graded gyroid lattice core and solid skin
tags: [lattice, bracket, hole, printer, export]
keywords:
  - lattice
  - gyroid
  - TPMS
  - schwarz
  - diamond lattice
  - lightweight
  - lightweighting
  - conformal lattice
  - graded infill
  - variable density
  - lattice infill
  - solid skin
  - additive
when_to_use: >-
  A printed part should be light but stay solid where it is loaded or
  fastened. Finish the B-rep body first (holes, unions, fillets), then make
  .lattice({...}) the LAST call: a TPMS lattice (gyroid / schwarzP / diamond /
  neovius; sheet wall or network density) inside a solid skin that follows
  every face, holes included. grade: { from: 'holes' | 'surface', near, over }
  thickens walls near the bores or the surface; grade: { from: 'fea' } reads
  the body's feaStudy (solved in process) through the stress-graded infill
  bands. The result is a watertight mesh solid: export STL / 3MF / OBJ (not
  STEP), check feature.lattice.report for the measured wall and solid
  fraction, and declare dfmSpec({ process: 'fdm', minWall }) so thin walls
  fail. Render a cut-away with `kernelcad render --section y=20`.
---

```typescript
const wall = param('wall', 8, { min: 6, max: 12 });
const width = 40;
const leg = 70;

// Shelf bracket: wall leg with two M5 clearance bores, shelf leg, root fillet.
const wallLeg = box(wall, width, leg)
  .hole('left', { u: 0, v: -10, diameter: 5.5, depth: 'through', name: 'screwLow' })
  .hole('left', { u: 0, v: 20, diameter: 5.5, depth: 'through', name: 'screwHigh' });
const bracket = wallLeg
  .union(box(leg, width, wall))
  .fillet(5, { parallel: [0, 1, 0], concave: true });

// Lattice walls fail the evaluate if they print thinner than 2 x nozzle / 0.8 mm.
dfmSpec({ process: 'fdm', minWall: 0.8 });

// LAST step: gyroid sheet core, 1.2 mm skin, walls 0.9 mm in the web
// growing to 2 mm within 8 mm of the screw bores.
return bracket.lattice({
  type: 'gyroid',
  cell: 6,
  wall: 0.9,
  skin: 1.2,
  grade: { from: 'holes', near: 2.0, over: 8 },
});

// evaluate -> feature.lattice.report: gyroid sheet, wall 0.90-1.9x mm, measured
//   wall p5 ~0.83 mm, skin 1.20 mm, watertight; dfm.lattice.enclosed-cavities (info)
// export 3mf / stl -> slicer-ready mesh solid; export step -> export.mesh-body.format-unsupported
```
