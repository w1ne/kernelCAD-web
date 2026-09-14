---
id: drawing-auto-dimension-gdt
title: Automatic dimensions, datums and position tolerances on an svg-drawing sheet
tags: [drawing, dimension, gdt, tolerance, datum]
keywords:
  - auto dimension a drawing with GD&T
  - autoAnnotate automatic dimensioning
  - datum reference frame A B C
  - ISO 2768 general tolerance note
  - declare a datum and a position tolerance in the script
  - oblique section view
when_to_use: You need a quotable engineering drawing without writing every callout. Export svg-drawing with autoAnnotate to derive datums, grouped bore callouts with position frames, positions from the datums, overall size, radii, chamfers, flatness and an ISO 2768 note from the geometry, and declare the datums or tolerances that are design intent with shape.datum and shape.tolerance.
---

```typescript
// Export:
//   kernelcad export svg-drawing mount.kcad.ts -o mount.svg --options '{"autoAnnotate":true}'
//   MCP: export({ target: 'model', file, format: 'svg-drawing', output_path,
//                 options: { format: 'svg-drawing', autoAnnotate: true } })
// Sheet: datums A (bottom, declared) / B / C, "4× ⌀6.5 THRU" over "⌖ ⌀0.05 A B C"
// (the declared frame replaces the ISO 2768-m default ⌀0.1), hole positions
// 10 / 70 and 10 / 40 from the datums, overall 80 / 50 / 10, "4× R5",
// flatness "⏥ 0.2" on A, and "ISO 2768-mK" beside the title block.
// drawing_report (MCP) / drawingReport (CLI --json) gives placed / overlapped counts.
let mount = box(80, 50, 10).fillet(5, { parallel: [0, 0, 1] });
for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]] as const) {
  mount = mount.subtract(cylinder(14, 3.25).translate(x, y, -2));
}
mount = mount
  .datum('A', { atZ: 0 })
  .tolerance({
    type: 'position', value: 0.05, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [10, 10, 10] },
  });
return mount;
```
