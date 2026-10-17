# Demo: import a FreeCAD document with `lib.fromCAD`

**Local validation, not deployed behaviour.** The clip was rendered from the
checked-in source in this repository. It has not been checked on the deployed site.

## What it shows

A FreeCAD document (`rp1-parts.FCStd`) holds two real RP1 parts from the
Roboparty `rp1_hardware` repository: the 7-DoF forearm lower body and the wrist end
cap. `lib.fromCAD` reads the document natively, with no FreeCAD install. The script
then unions a mounting plate onto the imported model and keeps the result as a
kernelCAD shape. The clip turns the model through eight poses.

## Caption (what to say)

- Imported: two real RP1 STEP-derived bodies from a FreeCAD `.FCStd` document.
- Placement: the bodies are spaced 260 mm apart along X for the demo. This is not the
  RP1 assembly placement.
- Not shown: SolidWorks or Parasolid import. Those need a converter (see
  `docs/usage/cad-import.md`).

## Files

| File | Role |
| --- | --- |
| `import-freecad.kcad.ts` | The source: `lib.fromCAD`, then a union with a plate. |
| `rp1-parts.FCStd` | The input document. Made by `make-fcstd.ts` from two RP1 STEP files. |
| `make-fcstd.ts` | Builds the FreeCAD-shaped document from STEP files. |
| `result.json` | `kernelcad evaluate --json` output: `ok: true`, 3 features, no diagnostics. |
| `demo.mp4` | 8-second loop: eight 45° turntable poses, 30 fps, 1024×1024. |

## How it was made

```sh
# Build the input document from the two RP1 STEP parts.
npx tsx docs/demos/cad-import-freecad/make-fcstd.ts \
  docs/demos/cad-import-freecad/rp1-parts.FCStd \
  "YCL.M000312 小臂下本体.STEP" "YCL.M000324 手腕端头本体.STEP"

# Evaluate and render the eight poses.
npx tsx src/agent/cli/index.ts evaluate docs/demos/cad-import-freecad/import-freecad.kcad.ts --json
npx tsx src/agent/cli/index.ts render docs/demos/cad-import-freecad/import-freecad.kcad.ts \
  --preset publish --separate --no-watermark \
  --pose 0,25 --pose 45,25 --pose 90,25 --pose 135,25 \
  --pose 180,25 --pose 225,25 --pose 270,25 --pose 315,25 --out <dir>/frame.png

# Encode the loop (ffmpeg, concat list of the eight frames, 0.5 s each, looped twice).
```

## Verification

- `src/modeling/parts/fromCad.test.ts`: 14 tests pass. They cover the FCStd parser,
  placement, multi-body compounds, Part-workbench input filtering, and the converter
  error paths.
- `tsc --noEmit`: clean.
- The demo script evaluates with no diagnostics. The frames were inspected visually.
- The wider `src/modeling/parts/` run has 7 failures in `fetchPart`, `findPart` and
  `standardParts` tests. The same 7 fail on the commit before this change, so they
  are not from this work.

## Limits

- The `.FCStd` layout was built against FreeCAD's documented format. FreeCAD itself is
  not installable here, so no file written by FreeCAD has been read yet.
- No SolidWorks or Parasolid converter has been run. The SolidWorks route is the
  macro in `docs/usage/solidworks-export-step.bas`, which needs SolidWorks.
