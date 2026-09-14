---
name: kernelcad-print
description: Close the physical print loop — slice a model to real G-code with a slicer CLI (export target:'model' format:'gcode'), then upload it to a network printer and start the print (send_to_printer). Load when the task is "print this" / "send this to my printer", not just "export the mesh".
---

# kernelCAD — print loop

## When to load this skill

Load when the task goes past a file on disk: the agent needs a physical
part, not just an STL/STEP. This skill covers the last two hops —
model -> G-code, and G-code -> printer.

## Slicing: `export` with `target: 'model'`, `format: 'gcode'`

```
export({
  target: 'model', file: 'part.kcad.ts', output_path: 'part.gcode',
  format: 'gcode',
  options: {
    format: 'gcode',
    printer: 'generic-fdm',   // bundled bed-size profile; default
    material: 'pla',          // 'pla' | 'petg'
    layerHeight: 0.2,         // mm; default 0.2
    infill: 15,               // percent, 0-100; default 15
    supports: false,          // default false
  },
})
```

CLI equivalent: `kernelcad export gcode <file> -o <out.gcode>`.

This shells out to a real slicer CLI (OrcaSlicer, or PrusaSlicer if that's
what's on PATH) — never a placeholder. Detection order: `KERNELCAD_SLICER`
env var, then PATH lookup of `orca-slicer`, `prusa-slicer`, `PrusaSlicer`.

Before invoking the slicer, the model's bounding box is checked against the
selected printer profile's bed size. Result diagnostics:

- `export.gcode.exceeds-bed` — the model doesn't fit the bed. Scale down,
  split into sub-parts, or pick a printer profile with a bigger bed.
- `export.gcode.slicer-unavailable` — no slicer CLI found. Install
  OrcaSlicer (or PrusaSlicer) and put it on PATH, or set
  `KERNELCAD_SLICER` to its binary path. The tool never fakes a result.

On success, the result carries `gcodeStats` parsed from the slicer's own
G-code comments — real numbers, not estimates: `estimatedPrintTimeSeconds`,
`filamentUsedGrams`, `filamentUsedMeters`, `layerCount`, `maxZMm`.

## Sending it to a printer: `send_to_printer`

```
send_to_printer({
  gcode_path: 'part.gcode',
  protocol: 'octoprint',   // 'octoprint' | 'moonraker' | 'bambu-lan'
  host: '192.168.1.50',
  api_key: '...',          // octoprint only
})
```

- `octoprint` — `POST /api/files/local` with `X-Api-Key`; uploads and (by
  default) selects + starts the print.
- `moonraker` — Klipper's `POST /server/files/upload`; uploads and starts.
- `bambu-lan` — Bambu Lab LAN mode: FTPS implicit-TLS upload on port 990
  (user `bblp`, password = the printer's LAN access code), then an MQTT
  print-start command on port 8883. Requires `access_code` and (unless
  `start_print: false`) `serial`.

Always try `{ dry_run: true }` first when talking to unfamiliar hardware —
it validates connectivity/auth without uploading or starting a print.
Failures come back as `tool.send-to-printer.unreachable` (can't connect/
auth) or `tool.send-to-printer.upload-failed` (connected, but the upload
or print-start command was rejected).

CLI equivalent: `kernelcad print send <gcode-file> --protocol <p> --host <h> ...`

## Full loop example

See `examples/print-loop-bracket.kcad.ts` and the `gcode-export-and-print`
cookbook snippet (`lookup_cookbook`).
