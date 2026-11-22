# EV charging dual-port pedestal cable material review — 2026-11-14

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`; their local previews: `samples/`.
- Local baseline and corrected target previews: `previews/before/`, `previews/after/`.
- Live detail/preview route and hash record: `live-baseline/routes.json`; captured public previews: `live-baseline/previews/` (script `capture_live_baseline.py`).
- Review demo: [16-second MP4](ev-charging-dual-port-pedestal-cable-material-review.mp4); source `make_demo.py`, slides in `slides/`.
- Frame review: run `verification/inspect-video.sh` to decode five frames into `video-review/` (regenerable, not tracked).
- No dated comparison against other catalog websites was recorded for this round.

## Change

The default `dual-port-ac-pedestal` render gave both hanging cable leads the teal
`powderCoat` finish of the enclosure. The asset had no cable control. The leads now use
a new `cableElastomer` colour control (default `#1b2427`, the default that
`ac-charging-bollard` in the same kit uses); both presets carry a `cableElastomer`
value. The enclosure keeps `powderCoat`. Geometry and envelope are unchanged. The render
is 352 triangles within the existing 2,400-triangle budget.

## Verification

- Focused exported-GLB regression: failed before the fix
  (`verification/focused-test-before.txt`), 1/1 passed after
  (`verification/focused-test.txt`).
- ESLint on `catalog/kits/ev-charging-infrastructure/` and the new test: exit 0, no
  diagnostics (`verification/lint.txt`).
- Index rebuild exit 0. The generated diff changes only the
  `ev-charging-infrastructure/dual-port-ac-pedestal` row.
- `npx vitest run tests/integration/catalog/` passed 75 files and 125 tests in 926 s,
  including the full catalog export and fresh-index check
  (`verification/catalog-integration.txt`).
- `python3 scripts/checkCatalogQuality.py` reports 2,400/2,402, the same as before this
  round. The two failing assets are `standard-components/retaining-ring` and
  `standard-components/beam-coupling`; neither file was changed in this round.
- The 16.04-second MP4 was inspected from decoded full-size frames; the object, material
  change and evidence boundary are readable.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts dual-port-ac-pedestal
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/ev-charging-infrastructure/ tests/integration/catalog/dualPortAcPedestalCableMaterial.test.ts
npx vitest run tests/integration/catalog/dualPortAcPedestalCableMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/ev-charging-dual-port-pedestal-cable-material-review-20261114/make_demo.py
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered preview, exported-GLB colour regression and generated index are branch
evidence. The public page still serves the captured baseline; this branch is not
deployed. No vendor-specific design, connector standard, electrical rating, installation
or hardware acceptance is claimed.
