# Wind-energy transformer radiator material review — 12 November 2026

## Review scope

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was checked before
editing at `3e87e4e35486577ed29a32093980046560d23282`: all 17 reported checks
were successful, the merge state was `CLEAN`, and no review had been submitted.
The five-preview sample was selected after checking open issue/PR targets and
source-file diffs. No competing fix was found.

The sample contains the blade-root protector, cable-entry boot, nacelle transport
frame, meter pedestal, and pad-mount transformer. The first four previews read as
their labeled objects and had no established material mismatch. The meter
pedestal's status light sits 18 mm below the cabinet; this geometry issue is
recorded for a later review. The transformer preview shows a tank, a side cooling
bank, ceramic bushings, and a concrete mounting pad. Its five modeled cooling fins
used an aluminium control separate from the coated-steel tank. The fins now share
the existing `powderCoatedSteel` control. The description was corrected to say
one side cooling bank, as modeled.

The transformer retains `powderCoatedSteel`, `concrete`, and `ceramic` material
controls and its `weathered` / `highVisibility` presets. The incorrect `aluminium`
control was removed. The correction changes no geometry: 360 triangles within a
500-triangle budget and the same 0.9 × 0.973 × 0.7 m envelope.

## Verification

- `npx eslint catalog/kits/wind-energy/ tests/integration/catalog/windFarmPadMountTransformerMaterials.test.ts`
- `npx vitest run tests/integration/catalog/windFarmPadMountTransformerMaterials.test.ts`
- `npx vitest run tests/integration/catalog/`
- Full result: 43 files / 68 tests passed, including the 2,402-asset catalog
  build and committed-index freshness comparison.
- `python3 scripts/checkCatalogQuality.py`: 2,401/2,402 (99.96%); unchanged
  `standard-components/beam-coupling` is the sole structural outlier.
- `python3 verify_asset_index.py`: 2,402 assets / 50 kits, fresh source hash,
  existing preview, and only the target row changed.
- The focused exported-GLB test checks fin/tank/lid, concrete pad, ceramic
  bushings, named controls/presets, description accuracy, triangle budget, and
  envelope. Full suite output and lint logs are retained here.
- All five public preview, source, and detail routes returned HTTP 200 before
  editing; public files matched the branch baseline. The public site remains on
  that baseline because this branch has not been deployed.

The external material-document comparison is retained privately in
`kernelCAD-private`; this public handoff describes native kernelCAD behavior.

## Review walkthrough

[View the 18-second MP4](wind-energy-pad-mount-transformer-radiator-material-review.mp4).
It shows the five preview sample, the transformer before and after, its native
material controls and presets, and local checks. Captions describe local source,
preview, and index validation; they do not claim deployment, simulation, or
hardware acceptance.

Recreate the demo with:

```bash
python3 artifacts/catalog-demos/wind-energy-pad-mount-transformer-radiator-material-review-20261112/capture_demo.py
```

The capture script, `demo-settings.json`, input slides, ffmpeg invocation,
`ffprobe` metadata, extracted frames, and visual inspection notes are retained.

## Retained evidence

- `sample/`: the five baseline source/render pairs opened for review.
- `before/` and `after/`: the target source and preview around the correction.
- `live-baseline/`, `public-route-check.json`, and
  `public-baseline-verification.json`: public pages, source and preview
  snapshots, HTTP status, and baseline hashes.
- `open-target-check.json`: open issue/PR searches and competing source-path
  checks.
- `index-verification.json` and command logs: generated-index, quality, lint,
  focused test, and full catalog integration results.
- `video-inputs/` and `video-review/`: generated demo inputs and inspected
  frames/contact sheet.

This is a visual catalog/material assignment correction only. It does not
validate supplier dimensions, transformer performance, electrical safety,
deployment, simulation, or physical acceptance.
