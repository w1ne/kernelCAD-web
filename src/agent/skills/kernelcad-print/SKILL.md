---
name: kernelcad-print
description: Close the physical print loop — check FDM printability and pick the print orientation first (dfmSpec process 'fdm'), slice a model to real G-code with a slicer CLI (export target:'model' format:'gcode'), then upload it to a network printer and start the print (send_to_printer). Load when the task is "print this" / "send this to my printer" / "will this print without supports", not just "export the mesh".
---

# kernelCAD — print loop

## When to load this skill

Load when the task goes past a file on disk: the agent needs a physical
part, not just an STL/STEP. This skill covers the last two hops —
model -> G-code, and G-code -> printer — plus the check that should come
before both: will it print, and which way up.

## Before slicing: FDM printability check

Declare the check in the script and evaluate it — it is cheaper than a
slice and says *why* a print would fail:

```
dfmSpec({ process: 'fdm' })                         // as modeled, +Z up
dfmSpec({ process: 'fdm', buildDirection: '+x', nozzleMm: 0.4,
          maxOverhangDeg: 45, maxBridgeMm: 10, printer: 'generic-fdm' })
```

`evaluate_script` / `kernelcad evaluate` then fail on unsupported overhangs
(`dfm.fdm.overhang-unsupported`), over-long bridges
(`dfm.fdm.bridge-too-long`), walls under 2 × nozzle
(`dfm.fdm.wall-below-nozzle`), and a part too big for the bed
(`dfm.fdm.exceeds-bed`); small holes/pins, low bed contact, and tip risk
warn. The overhang hint names the best axis-aligned rotation and what it
buys, e.g. `Rotate -90° about Y (.rotateY(-90), or dfmSpec buildDirection:
'+x'): unsupported area drops from 938.2 to 0.0 mm²`. The full per-part
report with all six orientations ranked is `verify({ check: 'dfm' })` (the
`fdm[]` block) or `kernelcad dfm <file> --json`.

Act on it by declaring that `buildDirection`. The gcode export below reads
it and rotates the part into that orientation before the bed gate and the
slicer, so the orientation that passed is the one that prints. Without an
FDM `dfmSpec` the part is sliced as modeled. If you choose to print with
supports instead, raise `maxOverhangDeg` to 90 and pass `supports: true`.

Worked example (fails as modeled, passes and slices on its side):
`examples/print-prep/wall-hook.kcad.ts` and
`examples/print-prep/wall-hook-on-side.kcad.ts`; cookbook snippet
`fdm-printability-and-print-orientation`.

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

Before invoking the slicer, the model's bounding box — in the FDM
`buildDirection` when one is declared — is checked against the selected
printer profile's bed size. Result diagnostics:

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
