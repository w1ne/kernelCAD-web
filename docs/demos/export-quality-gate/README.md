# Export quality gate: sliver faces caught at export time

Every STL, STEP, 3MF, OBJ, PLY and G-code export now screens each solid body
for tiny faces and short edges. This is the topology half of
`verify({ check: 'geometry-quality' })`, and it runs before the file is
written. This demo shows a mounting plate whose 1.5 mm locating strip was
typed 6.005 mm tall on a 6 mm plate. The union leaves a 0.005 mm step: two
0.0075 mm² end faces and four 0.005 mm edges. The fixed model ties the strip
height to the plate thickness and exports clean.

View the [12-second video](demo.mp4) (three scenes, 4 s each). The stills
`still-1.png`, `still-2.png` and `still-3.png` are frames from the same
renderer.

## Invocation

```sh
kernelcad export step docs/demos/export-quality-gate/plate-sliver.kcad.ts -o /tmp/out/plate-1.step
kernelcad export step docs/demos/export-quality-gate/plate-sliver.kcad.ts -o /tmp/out/plate-2.step --quality-gate block
kernelcad export step docs/demos/export-quality-gate/plate-fixed.kcad.ts  -o /tmp/out/plate-3.step
# MCP: export({ target: 'model', file, format: 'step', output_path, qualityGate: 'warn' | 'block' | 'off',
#               tiny_face_area_mm2?, short_edge_length_mm? })
```

| scene | model | gate | exit | file written | geometryQuality |
| --- | --- | --- | --- | --- | --- |
| 1 | plate-sliver | warn (default) | 0 | yes | `ok: false`, 2 tiny faces, 4 short edges |
| 2 | plate-sliver | block | 1 | no | same findings, as `error` diagnostics |
| 3 | plate-fixed | warn (default) | 0 | yes | `ok: true`, 0 / 0 |

The terminal output is captured verbatim in `terminal-1.txt` to
`terminal-3.txt`. Only OCCT's STEP-writer banner lines are filtered out.
`result.json` holds the MCP tool's `geometryQuality` summary and diagnostics
for the same three runs. The worst finding in scene 1 is
`short-edge 0.005 mm at [60, 19.25, 6.0025]`.

## What the frames show

- Left: the model, rendered from its own exported OBJ mesh by a small z-buffer
  rasterizer in `demo.ts`. Red rings mark the gate's `worst` locations. The
  5 µm step cannot be seen at model scale, so an inset zooms about 650x on
  the worst short edge. There the strip's top sits one thin band above the
  plate top.
- Right: the real `kernelcad export` CLI output for that run.
- Badge: exported with warnings, blocked with nothing written, or exported
  with quality ok.

## Provenance and validation (local)

This is a **local validation** run of this repository: the real CLI, run by
`demo.ts` through `npx tsx src/agent/cli/index.ts`, plus the MCP
`exportModelTool` function. It is not a deployed Studio session and not a
fabricated part. The renders show exported mesh geometry only. The gate is a
BREP topology screen: it does not certify manufacturability, loads or
hardware acceptance.

The video was inspected frame by frame from its stills:

- Scene 1 shows yellow WARN lines for both codes, `Wrote 58003 bytes`, exit 0
  and the zoomed step band.
- Scene 2 shows red ERROR lines ending in "Export blocked (qualityGate:
  block)", no "Wrote" line and exit 1.
- Scene 3 shows `geometry quality (warn): ok`, exit 0, and no rings or inset.

## Files

- `plate-sliver.kcad.ts`, `plate-fixed.kcad.ts`: the models (source of truth).
- `demo.ts`: runs the three exports, renders the frames and encodes
  `demo.mp4` with `ffmpeg -c:v libx264 -pix_fmt yuv420p`.
  `STILLS_ONLY=1` writes only the stills.
- `terminal-*.txt`, `result.json`, `still-*.png`, `demo.mp4`: outputs.

## Reproduce

```sh
npx tsx docs/demos/export-quality-gate/demo.ts
npx vitest run tests/integration/export/qualityGate.test.ts
```
