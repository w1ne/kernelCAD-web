---
id: stress-graded-infill-fdm
title: Dense infill only where an FDM print is stressed (FEA-graded infill 3MF)
tags: [fea, stress, load, printer, export, bracket]
keywords:
  - infill
  - weak spots
  - make it stronger
  - will it hold
  - where will it break
  - stress
  - lightweight print
  - save filament
  - variable infill
  - infill modifier
  - Bambu Studio
  - OrcaSlicer
  - A1
  - P1S
  - PETG
when_to_use: >-
  A 3D print carries a load and the user wants it strong where it
  matters and light everywhere else. Declare the load case with
  shape.feaStudy({ material, fixed, loads }) — fix the mounting holes, load
  the face the force acts on, force in TOTAL newtons — then export a 3MF with
  options.infill { fromFea: '<study name>' | true }. The export solves the
  study, splits the volume into stress bands relative to yield (default < 15 %
  -> 10 %, 15-40 % -> 25 %, > 40 % -> 60 % gyroid; override with
  infill.bands [{ name, fromYield, densityPercent }]) and writes one
  Orca/Bambu modifier volume per dense band with its own
  sparse_infill_density. The result carries infill { bands (volume % per
  band), saving (filament + time vs uniform infill at the high density),
  fea (peak stress, safety factor), images { heatmap, bands, cutaway } }.
  Requires the LOCAL CalculiX + gmsh toolchain (check with fea_summary({}));
  without it the export fails with fea.solver.unavailable and writes nothing.
  Orca/Bambu only — PrusaSlicer's modifier format is not written yet. The
  FEA treats the print as solid, so the safety factor is an upper bound.
---

```typescript
const wall = param('wall', 6, { min: 4, max: 12 });
const width = 40;
const leg = 70;

// PETG shelf bracket: the wall leg bolts on with two M5 screws, the shelf
// leg carries the load.
// Wall leg with two M5 clearance bores (5.5 mm, through) at 25 and 55 mm
// height (u/v are offsets from the face centre); shelf leg; root fillet.
const wallLeg = box(wall, width, leg)
  .hole('left', { u: 0, v: -10, diameter: 5.5, depth: 'through', name: 'screwLow' })
  .hole('left', { u: 0, v: 20, diameter: 5.5, depth: 'through', name: 'screwHigh' });

const bracket = wallLeg
  .union(box(leg, width, wall))
  .fillet(5, { parallel: [0, 1, 0], concave: true });

bracket.feaStudy({
  name: 'shelf-load',
  material: 'petg',
  // Held by the two screw bores: the only faces fully inside this box.
  fixed: { boundingBoxIn: { xMin: -1, xMax: wall.add(1), yMin: 15, yMax: 25, zMin: 20, zMax: 60 } },
  loads: [{ name: 'shelf', faces: { atZ: wall }, force: [0, 0, -120] }],  // 120 N TOTAL
  meshSize: 2.5,
});

// Then, through MCP:
//   export({ target: 'model', file: 'bracket.kcad.ts', output_path: 'bracket.3mf', format: '3mf',
//            options: { format: '3mf', printer: 'bambu-a1', arrange: 'assembled',
//                       infill: { fromFea: 'shelf-load' } } })
//   -> bands: low 10 % ~70 % of volume, mid 25 % ~29 %, high 60 % ~1 % (root of the lower bore)
//   -> saving: ~39 % less filament than uniform 60 % (estimate); OrcaSlicer 2.4.2 on the
//      same file: 17.4 g / 1h27m vs 27.8 g / 3h42m uniform 60 %
//   -> fea: peak ~45 MPa vs 55 MPa yield, safety factor ~1.2, ~5 mm deflection
// Open bracket.3mf in Bambu Studio / OrcaSlicer: the modifiers show under the
// object with their own infill density.
return bracket;
```
