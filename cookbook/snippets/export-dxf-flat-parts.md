---
id: export-dxf-flat-parts
title: DXF for laser, waterjet and CNC — flat blanks, panels, cut lists and sections
tags: [export, manufacturing]
keywords:
  - export a flat blank to DXF for laser or waterjet cutting
  - CNC cut list of plywood panels with one DXF file per panel
  - true arcs and circles in the DXF, not faceted polylines
  - cross-section DXF of a 3D body at a height for a plan or floor plan
  - export.dxf.non-planar refusal for a body that is not flat
when_to_use: You need a 2D cut file — a flat blank with holes and slots, a panel, an extruded profile, or a whole cut list of flat panels — or a section of any 3D body at one height (plans, floor plans, profiles). Export format dxf finds the blank's own plane in any orientation and writes the outline and holes with exact arcs and circles.
---

```typescript
// A 3 mm blank: two holes and a slot. Any orientation works — the DXF is
// drawn in the blank's own plane with its true sizes.
const t = param('thickness', 3, { min: 1, max: 20 });

let blank = box(100, 60, t);
blank = blank.subtract(cylinder(t, 4).translate(20, 30, 0));
blank = blank.subtract(cylinder(t, 4).translate(80, 30, 0));
const slot = box(20, 6, t).translate(40, 12, 0)
  .union(cylinder(t, 3).translate(40, 15, 0))
  .union(cylinder(t, 3).translate(60, 15, 0));
return blank.subtract(slot);

// Then, outside the script:
//   export target:'model' format:'dxf' output_path:'blank.dxf'
//   -> one closed LWPOLYLINE per loop on layer 'cut': the 100 x 60
//      outline from (0, 0), each hole as an exact circle, the slot with
//      exact half-circle ends ($INSUNITS 4 = mm; options.unit 'cm' | 'in').
//
// A cut list: return an assembly of flat panels.
//   -> output_path gets them side by side, one layer each, and
//      parts/<name>.dxf holds one file each (reported in part_files).
//      options: { format: 'dxf', layout: 'sheet' } writes the sheet only.
//
// A 3D body (pocketed block, housing, building): export a section.
//   options: { format: 'dxf', section: { axis: 'z', at: 25 } }
//   -> the cross-section at z = 25 in world X/Y.
//
// A body that is neither flat nor sectioned fails with
// export.dxf.non-planar; its hint names section, flatten_pattern (sheet
// metal) and STEP/STL.
```
