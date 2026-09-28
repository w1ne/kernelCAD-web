---
id: export-dxf-flat-parts
title: DXF for laser, waterjet and CNC — flat parts, cut lists and sections
tags: [export, manufacturing, plate, assembly]
keywords:
  - export a plate or bracket to DXF for laser or waterjet cutting
  - CNC cut list of plywood panels one DXF per part
  - true arcs and circles in the DXF, not faceted polylines
  - cross-section DXF of a 3D part at a height for a plan or floor plan
  - export.dxf.non-planar refusal for a part that is not flat
when_to_use: You need a 2D cut file from a normal part — a plate with holes and slots, a panel, an extruded profile, or a whole cut list of flat parts — or a section of any 3D part at one height (plans, floor plans, profiles). Export format dxf finds the plate's own plane in any orientation and writes the outline and holes with exact arcs and circles.
---

```typescript
// A 3 mm mounting plate: two holes and a slot. Any orientation works — the
// DXF is drawn in the plate's own plane with its true sizes.
const t = param('thickness', 3, { min: 1, max: 20 });

let plate = box(100, 60, t);
plate = plate.subtract(cylinder(t, 4).translate(20, 30, 0));
plate = plate.subtract(cylinder(t, 4).translate(80, 30, 0));
const slot = box(20, 6, t).translate(40, 12, 0)
  .union(cylinder(t, 3).translate(40, 15, 0))
  .union(cylinder(t, 3).translate(60, 15, 0));
return plate.subtract(slot);

// Then, outside the script:
//   export target:'model' format:'dxf' output_path:'plate.dxf'
//   -> one closed LWPOLYLINE per loop on layer 'cut': the 100 x 60
//      outline from (0, 0), each hole as an exact circle, the slot with
//      exact half-circle ends ($INSUNITS 4 = mm; options.unit 'cm' | 'in').
//
// A cut list: return an assembly of flat parts (panels, plates).
//   -> output_path gets every part side by side, one layer per part, and
//      parts/<part>.dxf holds one file per part (reported in part_files).
//      options: { format: 'dxf', layout: 'sheet' } writes the sheet only.
//
// A 3D part (pocketed block, housing, building): export a section.
//   options: { format: 'dxf', section: { axis: 'z', at: 25 } }
//   -> the cross-section at z = 25 in world X/Y.
//
// A part that is neither flat nor sectioned fails with
// export.dxf.non-planar; its hint names section, flatten_pattern (sheet
// metal) and STEP/STL.
```
