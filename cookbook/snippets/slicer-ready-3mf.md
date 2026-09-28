---
id: slicer-ready-3mf
title: Export a slicer-ready multi-colour 3MF (parts on the plate, one filament per colour)
tags: [manufacturing, export, printer, assembly]
keywords:
  - multi colour multi material 3mf for a slicer
  - open in slicer with objects laid out on the plate
  - colour and material kept per object in 3mf
  - two colour keycap inlay print
  - one filament slot per colour
  - auto orient largest flat face down
  - send 3mf project to a bambu lab printer
  - printer profile bed size for my printer
when_to_use: You want a model to open in a desktop slicer ready to print — every assembly member a named object with its colour and material, either packed on the bed at Z=0 without overlap or kept together as one multi-colour object (an inlay), each colour on its own filament slot — instead of a bare STL or already-sliced G-code.
---

```typescript
// Two-colour keycap: the legend is a separate part sitting in a pocket of
// the shell, so the slicer prints it in a second filament. Colours come
// from .color(); the material name ('pla') names the 3MF base material.
const size = param('size', 18, { min: 12, max: 30 });
const height = param('height', 8, { min: 4, max: 15 });
const depth = 1.2;

const legend = box(6, 6, depth).translate(size.divide(2).subtract(3), size.divide(2).subtract(3), height.subtract(depth));
const shell = box(size, size, height).subtract(legend);

const cap = assembly('keycap');
cap.part('shell', shell.color('#202020'), { material: 'pla' });
cap.part('legend', legend.color('#ffffff'), { material: 'pla' });
return cap.model();

// Then, outside the script:
//   export target:'model' format:'3mf' output_path:'keycap.3mf'
//     options:{ format:'3mf', arrange:'assembled', printer:'bambu-a1' }
//   printer picks the bed (A1: 256x256x256 mm) and the slicer family
//   (bambu here; pass slicer to override). List the ids and volumes with
//   `kernelcad print printers` (default 'generic-fdm', 220x220x250 mm).
//   -> one 'keycap' object with parts 'shell' (filament 1, #202020) and
//      'legend' (filament 2, #FFFFFF), dropped to Z=0, centred on the bed.
//   Separate parts instead? arrange:'plate' packs each part on the bed
//   at Z=0 with 5 mm gaps; add orient:true to lay each on its largest
//   flat face. slicer:'prusa' writes that slicer's own volume config;
//   slicer:'generic' (default) writes plain core 3MF only.
//
//   Too much for one bed? The file is still written, and the result
//   carries warn diagnostics: export.3mf.plate-overflow names the parts
//   packed past the bed edge and the footprint the layout needs;
//   export.3mf.exceeds-bed names a part larger than the bed or taller
//   than its build height. Both hints end with the smallest bundled
//   profiles the same layout fits on, e.g.
//   "Fits on: Bambu Lab H2D ('bambu-h2d'), ..." — pass that printer, or
//   export fewer parts per plate.
//
//   Bambu Lab printer over LAN: slice to G-code (format:'gcode'), then
//   send_to_printer gcode_path:'keycap.gcode' model_3mf_path:'keycap.3mf'
//     protocol:'bambu-lan' printer:'bambu-a1' host:'...' access_code:'...' serial:'...'
//   -> uploads keycap.gcode.3mf (this 3MF + Metadata/plate_1.gcode).
```
