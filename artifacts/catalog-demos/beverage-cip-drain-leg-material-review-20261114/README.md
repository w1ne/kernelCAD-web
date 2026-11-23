# Beverage CIP valve manifold drain-leg material review — 2026-11-14

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`; their local previews: `samples/`.
- Local baseline and corrected target previews: `previews/before/`, `previews/after/`.
- Live detail/preview route and hash record: `live-baseline/routes.json` (script `capture_live_baseline.py`). All five live preview hashes match the local baseline previews, so the images are not duplicated.
- Review demo: [16-second MP4](beverage-cip-drain-leg-material-review.mp4); source `make_demo.py`, slides in `slides/`.
- Frame review: run `verification/inspect-video.sh` to decode five frames into `video-review/` (regenerable, not tracked).
- No dated comparison against other catalog websites was recorded for this round.

## Change

In `beverage-bottling-line/cip-valve-manifold`, the shared `finishPart` name regex
matched `leg` in `drain-leg`. It painted the drain pipe with `powderCoat`, the finish of
the floor feet. A CIP drain leg is a wetted process pipe and is stainless steel in
sanitary service. `drain-leg` now takes the existing `stainlessSteel` control directly.
The part name, geometry, envelope, triangle count (448 / 2,200), both colour controls and
both presets are unchanged. The four `mount-foot-*` pads keep `powderCoat`.

## Verification

- Focused exported-GLB regression: failed on the old source
  (`verification/focused-test-before.txt`, `drain-leg` found in the `powderCoat` zone),
  1/1 passed after (`verification/focused-test.txt`).
- ESLint on `catalog/kits/beverage-bottling-line/` and the new test: exit 0, no
  diagnostics (`verification/lint.txt`).
- Index rebuild exit 0. The generated diff changes only the
  `beverage-bottling-line/cip-valve-manifold` row: `sourceSha256` and the move of
  `drain-leg` from the `powderCoat` palette zone to `stainlessSteel`.
- `npx vitest run tests/integration/catalog/` passed 77 files and 127 tests in 799 s,
  including the full catalog export and fresh-index check
  (`verification/vitest-catalog.txt`).
- `python3 scripts/checkCatalogQuality.py`: beverage-bottling-line 50/50; whole catalog
  2,400/2,402, the same as before this round (the two failing assets are in
  `standard-components`, which this round does not change).
- The 16.04-second MP4 was inspected from decoded full-size frames. The before and after
  drain-leg colour and the evidence boundary are readable.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts cip-valve-manifold
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/beverage-bottling-line/ tests/integration/catalog/cipValveManifoldDrainLegMaterial.test.ts
npx vitest run tests/integration/catalog/cipValveManifoldDrainLegMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/beverage-cip-drain-leg-material-review-20261114/make_demo.py
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered preview, exported-GLB colour regression and generated index are branch
evidence. The public page still serves the captured baseline; this branch is not
deployed. No vendor design, sanitary certification or hardware acceptance is claimed.
The asset is still geometrically wrong as a manifold (vertical headers, unconnected
branches and feet); see the ledger.
