# Wind converter cabinet material review — 2026-11-13

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Open issue/PR overlap check: [open-target-check.txt](verification/open-target-check.txt).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`.
- Local baseline and corrected target previews: `previews/before/`, `previews/after/`.
- Four other audited local previews: `samples/`.
- Live detail/preview route and hash record: `live-baseline/routes.json`; captured public baseline preview files are in `live-baseline/previews/`.
- Review demo: [16-second MP4](wind-converter-cabinet-material-review.mp4); source `make_demo.py`, settings `demo-settings.json`, invocation `build-demo.sh`.
- Video frame review: `video-review/`.
- A dated material comparison was recorded privately; this public handoff stays focused on the generic kernelCAD asset.

## Verification

- The index rebuild completed successfully. Its generated diff changes only the
  `wind-energy/converter-cabinet` row; the row's source SHA matches the source file,
  and its preview path resolves to the rendered PNG.
- ESLint completed without diagnostics. The focused exported-GLB regression passed
  1/1 test.
- `npx vitest run tests/integration/catalog/` passed all 71 files and 116 tests,
  including the complete catalog export and fresh-index check. Captured output is in
  `verification/catalog-integration.txt`.
- The 15.91-second MP4 was inspected from full-size frames; the object, material
  change, and verification/evidence boundary remain readable.

## Change

The default `converter-cabinet` render gave both full-height access doors the yellow
`safetyPaint` finish. The door panels now use the existing `powderCoatedSteel` control;
two small door-label blocks retain `safetyPaint`. The cabinet silhouette and envelope
are unchanged. The render is 132 triangles within the existing 300-triangle budget.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts converter-cabinet
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/wind-energy/ tests/integration/catalog/windConverterCabinetMaterials.test.ts
npx vitest run tests/integration/catalog/windConverterCabinetMaterials.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/wind-converter-cabinet-material-review-20261113/capture_live_baseline.py
bash artifacts/catalog-demos/wind-converter-cabinet-material-review-20261113/build-demo.sh
bash artifacts/catalog-demos/wind-converter-cabinet-material-review-20261113/verification/inspect-video.sh
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered preview, exported-GLB color regression and generated index are branch
evidence. The current public page still serves the captured baseline; this branch is not
deployed. No vendor-specific design, electrical rating, power-conversion simulation,
installation, or hardware acceptance is claimed.
