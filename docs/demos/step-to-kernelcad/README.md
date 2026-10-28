# STEP to KernelCAD importer demo

This retained local demo imports a named, colored STEP solid into a KernelCAD
bundle and evaluates the generated project through the existing CLI.

## Reproduce

From the repository root, with Node 22 and the checked out dependencies:

```bash
npm run build:cli
bash docs/demos/step-to-kernelcad/capture.sh
python3 docs/demos/step-to-kernelcad/render_demo.py
```

The smoke import and part-evaluation commands write their unedited JSON output
to `verification/import-cli.json` and `verification/parts-cli.json`. The capture
also imports the nested, multi-file AP214 assembly fixture shipped in the pinned
`occt-import-js` dev dependency. Its import report, part-evaluation report, and
manifest are retained as `verification/external-import.json`,
`verification/external-parts.json`, and `verification/external-manifest.json`.
`verification/nested-reference-paths.json` covers sidecars in a subdirectory;
`verification/missing-reference.json` and `verification/unsafe-reference.json`
record structured failures with no partial bundle.
The video is rendered from those CLI outputs and the smoke bundle manifest at
1920×1080, 30 fps, with four six-second frames. `verification/frame-*.png` are
the inspected video frames.

## Retained source and result

- `source.step` is a small 10 × 20 × 30 mm solid exported by Open CASCADE. Its
  STEP product is named `Smoke Box`, carries a blue surface color, and declares
  millimetres.
- `bundle/` contains the generated `Smoke Box.kcad.ts`, `manifest.json`, and
  content-addressed native BREP asset.
- `verification/unicode-name.step` exercises a STEP Part 21 Unicode product
  name in addition to the demo fixture.
- `verification/unicode-bundle/manifest.json` records the preserved product
  name `Mötor`; `verification/inch-import.json` records a self-contained
  conversion-based INCH solid import.
- `verification/fixture-sources.json` records hashes for the nested assembly
  fixtures used for local verification. The multi-file AP214 fixture exercises
  12 recursively referenced STEP sidecars, shared definitions, placements, and
  both INCH and millimetre unit declarations.
- `step-to-kernelcad.mp4` shows the actual CLI result and the generated
  project's measured part statistics.

The retained verification JSON records local CLI evidence only. It does not
claim a deployed import flow or physical acceptance. The importer preserves
STEP product names, assembly occurrence paths, rigid placements, length units,
component colors, and exact native BREP definitions. It produces a static
assembly; it does not infer mates, joints, motion, or source feature history.
Relative local STEP dependencies are staged recursively and hashed in the
manifest. Missing references and references that escape the input directory
fail with a structured error before a bundle is published.
