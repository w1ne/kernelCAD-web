---
id: exploded-assembly-drawing
title: Exploded isometric with BOM balloons and a bill table
tags: [exploded-view, balloons, drawing, bom]
keywords:
  - exploded view
  - mate-axis explode
  - radial explode
  - item balloons
  - bill table
  - svg-drawing exploded
when_to_use: You need an exploded isometric of a multi-body assembly — bodies pulled apart along mate axes or radially from the centroid — with BOM-numbered balloons and a bill table on a svg-drawing sheet, or the same explode on render_preview.
---

```typescript
const arm = assembly('enclosure');
arm.part('plate', box(80, 60, 3), { material: 'aluminum' });
for (let i = 0; i < 4; i++) {
  const x = i % 2 === 0 ? 8 : 72;
  const y = i < 2 ? 8 : 52;
  arm.part('standoff_' + i, cylinder(3, 12), { at: [x, y, 3], material: 'pla' });
}
arm.part('board', box(68, 48, 1.6), { at: [6, 6, 15], material: 'pla' });
arm.part('lid', box(80, 60, 2), { at: [0, 0, 16.6], material: 'abs' });
return arm.model();
```
