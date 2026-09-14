---
id: gcode-export-and-print
title: Close the print loop — export gcode, then send_to_printer
tags: [manufacturing, gcode, printer, parameter]
keywords:
  - slice geometry to gcode with a real slicer CLI binary
  - export format gcode layerHeight infill supports material
  - upload gcode to OctoPrint Moonraker or Bambu Lab over the network
  - physical print loop from script to a networked FDM printer
  - bed size check before invoking the slicer export.gcode.exceeds-bed
when_to_use: You have a finished, watertight kernelCAD part and want to go straight to a physical print — slice it to G-code with a real slicer (no manual GUI step), then upload it to a network-connected printer and start the print, without a human touching a slicer or a printer's touchscreen.
---

```typescript
// Print-ready part sized to fit the bundled 'generic-fdm' bed profile
// (220x220x250mm) — see export.gcode.exceeds-bed if it doesn't.
const width = param('width', 30, { min: 5, max: 200 });
const height = param('height', 20, { min: 5, max: 200 });

return box(width, width, height)
  .fillet(2, { parallel: [0, 0, 1] });

// Then, outside the script:
//   export target:'model' format:'gcode' output_path:'part.gcode'
//     options:{ format:'gcode', printer:'generic-fdm', material:'pla',
//               layerHeight:0.2, infill:15, supports:false }
//   -> ok:true, byte_count, and the slicer's own real stats in
//      the result's gcodeStats (estimatedPrintTimeSeconds,
//      filamentUsedGrams, layerCount, maxZMm).
//   No slicer installed? You get ok:false with
//   export.gcode.slicer-unavailable and an install hint — never a
//   placeholder gcode file.
//
//   send_to_printer gcode_path:'part.gcode' protocol:'octoprint'
//     host:'192.168.1.50' api_key:'...'
//   -> uploads and starts the print. Pass dry_run:true first to
//      confirm connectivity/auth before ever touching hardware.
```
