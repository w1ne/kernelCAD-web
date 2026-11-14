# Shipyard weld inspection light lens material review — 2026-11-14

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`; their local previews: `samples/`.
- Local baseline and corrected target previews: `previews/before/`, `previews/after/`.
- Live detail/preview route and hash record: `live-baseline/routes.json`; captured public previews: `live-baseline/previews/` (script `capture_live_baseline.py`).
- Review demo: [16-second MP4](shipyard-weld-inspection-light-lens-material-review.mp4); source `make_demo.py`, slides in `slides/`.
- Frame review: run `verification/inspect-video.sh` to decode five frames into `video-review/` (regenerable, not tracked).
- No dated comparison against other catalog websites was recorded for this round.

## Change

The default `weld-inspection-light-stand` render gave both lamp lenses the yellow
`safetyMarking` finish of the lamp housings behind them. The lens parts now use a new
`lampLens` colour control (default `#f3f0d8`); both presets carry a `lampLens` value.
The housings keep `safetyMarking`. Geometry and envelope are unchanged. The render is
252 triangles within the existing 1,800-triangle budget.

## Merge before the audit

PR #1258 conflicted with `develop` in `catalog/index.json` and
`standard-components/shaft-collar`. Merge commit `97a815150` took the `develop` version
of `shaft-collar` (drilled set-screw collar, #1390, with its regression test). The
branch's split-clamp option on that asset was dropped; the separate `split-shaft-collar`
asset covers that style. The index was regenerated in the merge commit.

## Verification

- Focused exported-GLB regression: failed before the fix
  (`verification/focused-test-before.txt`), passed after together with the merged
  shaft-collar test, 2 files and 4 tests (`verification/focused-test.txt`).
- ESLint on `catalog/kits/shipyard/` and the new test: no diagnostics
  (`verification/lint.txt`).
- Index rebuild exit 0. The generated diff changes only the
  `shipyard/weld-inspection-light-stand` row.
- `npx vitest run tests/integration/catalog/` passed 74 files and 124 tests, including
  the full catalog export and fresh-index check (`verification/catalog-integration.txt`).
- `python3 scripts/checkCatalogQuality.py` reports 2,400/2,402. The two failing assets
  are `standard-components/retaining-ring` and `standard-components/beam-coupling`,
  each a one-colour part. Neither file was changed in this round.
- The 16.04-second MP4 was inspected from five full-size frames; the object, material
  change and evidence boundary are readable.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts weld-inspection-light-stand
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/shipyard/ tests/integration/catalog/weldInspectionLightLensMaterial.test.ts
npx vitest run tests/integration/catalog/weldInspectionLightLensMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/shipyard-weld-inspection-light-lens-material-review-20261114/make_demo.py
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered preview, exported-GLB colour regression and generated index are branch
evidence. The public page still serves the captured baseline; this branch is not
deployed. No vendor-specific design, photometric data, electrical rating, installation
or hardware acceptance is claimed.
