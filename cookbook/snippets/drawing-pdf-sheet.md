---
id: drawing-pdf-sheet
title: Printable engineering drawing as a PDF on a standard sheet, in one export call
tags: [drawing, dimension, gdt, tolerance, datum]
keywords:
  - export a drawing as PDF
  - printable engineering drawing for a machine shop
  - A3 A4 ANSI sheet title block
  - first angle third angle projection
  - title block material revision part number
  - pdf-drawing
when_to_use: You need a drawing to send to a shop or publish — a vector PDF on an ISO A0–A4 or ANSI A–E sheet with orthographic views, hidden lines, the automatic dimensions, hole callouts and GD&T, and a title block carrying title, part name, material, scale, units, projection, sheet size, date and revision. Export format pdf-drawing; the sheet content is the svg-drawing sheet.
---

```typescript
// Export:
//   kernelcad export pdf-drawing bearing-plate.kcad.ts -o bearing-plate.pdf \
//     --title "Bearing plate" --material "S235JR" --revision A --sheet a3
//   MCP: export({ target: 'model', file, format: 'pdf-drawing', output_path: 'bearing-plate.pdf',
//                 options: { format: 'pdf-drawing', title: 'Bearing plate', partName: 'BP-100',
//                            material: 'S235JR', revision: 'A', projection: 'first' } })
// Sheet: A3 landscape (default; sheet: 'auto' picks the smallest ISO sheet that holds the
// views at 1:1), scale snapped to the standard series and printed in the title block.
// Views front / top / left + isometric; the bore and bolt holes show as dashed hidden lines.
// autoAnnotate is on by default: datums A/B/C, "4× Ø9 THRU" and "Ø30 THRU" each with a
// "⌖ Ø0.1 A B C" frame, hole positions, overall 100 / 70 / 12, "4× R6", ISO 2768-mK.
// Unset title-block fields print "—". drawing_report (MCP) / drawingReport (CLI --json)
// gives placed / overlapped counts.
const w = 100, h = 70, t = 12;
// Bore and bolt holes as real hole features: u/v are mm from the top face centre.
const plate = box(w, h, t)
  .fillet(6, { parallel: [0, 0, 1] })
  .hole('top', { u: 0, v: 0, diameter: 30, depth: 'through', name: 'bore' })
  .holes('top', {
    positions: [{ u: -38, v: -23 }, { u: 38, v: -23 }, { u: -38, v: 23 }, { u: 38, v: 23 }],
    diameter: 9,
    depth: 'through',
  });
return plate.datum('A', { atZ: 0 });
```
