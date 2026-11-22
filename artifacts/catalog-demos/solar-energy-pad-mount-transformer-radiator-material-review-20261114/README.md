# Solar energy pad-mount transformer radiator material review — 2026-11-14

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`; their local previews: `samples/`.
- Local baseline and corrected target previews: `previews/before/`, `previews/after/`.
- Live detail/preview route and hash record: `live-baseline/routes.json`; captured public previews: `live-baseline/previews/` (script `capture_live_baseline.py`).
- Review demo: [16-second MP4](solar-energy-pad-mount-transformer-radiator-material-review.mp4); source `make_demo.py`, slides in `slides/`.
- Frame review: run `verification/inspect-video.sh` to decode five frames into `video-review/` (regenerable, not tracked).
- No dated comparison against other catalog websites was recorded for this round.

## Change

The default `solar-energy/pad-mount-transformer` render gave all 18 radiator fins the
bare `stainlessSteel` finish, in contrast to the painted tank. Transformer cooling fins
are steel painted with the tank. The fins now use the existing `powderCoat` control
(default `#687c7c`). The bushing bases, bushing caps and lifting bars keep
`stainlessSteel`. No control or preset was added or removed. Geometry and envelope are
unchanged. The render is 660 triangles within the existing 1,800-triangle budget.

## Verification

- Focused exported-GLB regression: failed before the fix
  (`verification/focused-test-before.txt`), 1/1 passed after
  (`verification/focused-test.txt`).
- ESLint on `catalog/kits/solar-energy/` and the new test: exit 0, no diagnostics
  (`verification/lint.txt`).
- Index rebuild exit 0. The generated diff changes only the
  `solar-energy/pad-mount-transformer` row.
- `npx vitest run tests/integration/catalog/` passed 76 files and 126 tests in 809 s,
  including the full catalog export and fresh-index check
  (`verification/catalog-integration.txt`).
- `python3 scripts/checkCatalogQuality.py` reports 2,400/2,402, the same as before this
  round. The two failing assets are in `standard-components`; no file in that kit was
  changed in this round.
- The 16.04-second MP4 was inspected from decoded full-size frames; the object, material
  change and evidence boundary are readable.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts pad-mount-transformer
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/solar-energy/ tests/integration/catalog/solarPadMountTransformerRadiatorMaterial.test.ts
npx vitest run tests/integration/catalog/solarPadMountTransformerRadiatorMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/solar-energy-pad-mount-transformer-radiator-material-review-20261114/make_demo.py
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered preview, exported-GLB colour regression and generated index are branch
evidence. The public page still serves the captured baseline; this branch is not
deployed. No vendor-specific design, electrical rating, installation or hardware
acceptance is claimed. The object label ("pad-mount") is not verified by this change; see
the ledger.
