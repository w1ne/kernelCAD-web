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
    printer: 'generic-fdm',   // printer profile id (see "Printer profiles"); default
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
printer profile's bed size. The same profile's bed is then passed to the
slicer CLI as `--printable-area` and `--printable-height` (OrcaSlicer's
real flags — not `--bed-shape`), so a 180 mm column on `generic-fdm` (250 mm)
actually slices instead of being rejected at the slicer's ~100 mm default.
Result diagnostics:

- `export.gcode.exceeds-bed` — the model doesn't fit the bed. Scale down,
  split into sub-parts, or pick a printer profile with a bigger bed; the
  hint names the smallest profiles it fits on.
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
  `start_print: false`) `serial`. The printer prints 3MF projects, so the
  upload is a `.gcode.3mf`: the G-code as `Metadata/plate_1.gcode` inside
  the model 3MF passed as `model_3mf_path: 'part.3mf'` (export format `'3mf'` with
  `{ arrange: 'plate', slicer: 'bambu' }`), or inside a minimal 3MF shell.

Pass `printer: '<id>'` to check the profile against `protocol` before
anything is sent: an unknown id is refused with the valid ids,
`bambu-lan` needs a Bambu Lab profile, and a Bambu Lab profile needs
`bambu-lan`.

Always try `{ dry_run: true }` first when talking to unfamiliar hardware —
it validates connectivity/auth without uploading or starting a print.
Failures come back as `tool.send-to-printer.unreachable` (can't connect/
auth) or `tool.send-to-printer.upload-failed` (connected, but the upload
or print-start command was rejected).

CLI equivalent: `kernelcad print send <gcode-file> --protocol <p> --host <h> ...`

## Opening it in a slicer yourself: slicer-ready 3MF

For multi-colour / multi-material parts, or when a human slices, export a
3MF instead of G-code:

```
export({ target: 'model', file: 'keycap.kcad.ts', format: '3mf', output_path: 'keycap.3mf',
  options: { format: '3mf', arrange: 'assembled', slicer: 'bambu' } })
```

`arrange: 'plate'` lays separate parts out on the bed (Z=0, no overlap;
`orient: true` puts each part's largest flat face down); `arrange:
'assembled'` keeps an inlay in place as one multi-part object. `slicer`
writes the per-object filament slot (slot N = Nth distinct colour); pick
the filament colours in the slicer. See the `slicer-ready-3mf` cookbook
snippet.

The layout is checked against the `printer` bed (default `generic-fdm`,
220×220×250 mm). Naming a `printer` also sets the `slicer` default to its
family (`printer: 'bambu-a1'` writes the bambu sidecar). Parts that do not
fit are still written, and the result carries `warn` diagnostics naming
them; the hint ends with the smallest bundled profiles the same layout
fits on (`Fits on: Bambu Lab H2D ('bambu-h2d'), ...`):

- `export.3mf.plate-overflow` — `plate` packed more parts than the bed
  holds; the message names the parts past the edge and the footprint the
  layout needs. Use a larger-bed profile, or export fewer parts per plate.
- `export.3mf.exceeds-bed` — a part (or the `assembled` object) is larger
  than the bed in X/Y or taller than the build height. Use a larger-bed
  profile, try `orient: true`, or split the part.

## Printer profiles

One registry drives the 3MF `arrange` bed, the bed-fit warnings, the gcode
bed gate and slicer bed, `dfmSpec({ printer })` and `send_to_printer`.
The bed is the usable single-tool build volume from the maker's spec page
(URL and check date in `kernelcad print printers --json`). All ship a
0.4 mm nozzle. An unknown id fails with the list of valid ids.

| id | build volume (mm) | slicer |
|---|---|---|
| `generic-fdm` | 220×220×250 | generic |
| `bambu-a1-mini` | 180×180×180 | bambu |
| `bambu-a1` | 256×256×256 | bambu |
| `bambu-p1s` | 256×256×250 (front-left 18x28 mm cutter zone not modelled) | bambu |
| `bambu-p1p` | 256×256×250 (front-left 18x28 mm cutter zone not modelled) | bambu |
| `bambu-x1c` | 256×256×256 (front-left 18x28 mm cutter zone not modelled) | bambu |
| `bambu-x1e` | 256×256×256 (front-left 18x28 mm cutter zone not modelled) | bambu |
| `bambu-h2d` | 325×320×325 (single nozzle; both nozzles: 300x320x325 mm) | bambu |
| `bambu-h2s` | 340×320×340 | bambu |
| `prusa-mini-plus` | 180×180×180 | prusa |
| `prusa-mk4s` | 250×210×220 | prusa |
| `prusa-core-one` | 250×220×270 | prusa |
| `prusa-xl` | 360×360×360 | prusa |
| `creality-ender-3-v3` | 220×220×250 | orca |
| `creality-k1` | 220×220×250 | orca |
| `creality-k1-max` | 300×300×300 | orca |
| `creality-k2-plus` | 350×350×350 | orca |
| `elegoo-neptune-4-pro` | 225×225×265 | orca |
| `anycubic-kobra-3` | 250×250×260 | orca |
| `voron-2.4-250` | 250×250×210 | orca |
| `voron-2.4-300` | 300×300×260 | orca |
| `voron-2.4-350` | 350×350×310 | orca |
| `ultimaker-s5` | 330×240×300 | generic |

CLI: `kernelcad print printers` (add `--json` for the full records).

## Full loop example

See `examples/print-loop-bracket.kcad.ts` and the `gcode-export-and-print`
cookbook snippet (`lookup_cookbook`).
