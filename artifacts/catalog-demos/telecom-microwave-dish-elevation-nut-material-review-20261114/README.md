# Telecom microwave dish elevation-nut material review — 2026-11-14

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline and corrected source: `source/before/`, `source/after/`.
- Four other audited source files: `source/samples/`; their local previews: `samples/`.
- Local default previews (identical before and after): `previews/before/microwave-dish-antenna.png`, `previews/after/microwave-dish-antenna.png`.
- Focused before/after mount views from `kernelcad render inspect --focus`: `previews/{before,after}/inspect-mount-{right,iso,right-crop}.png`.
- Live detail/preview route and hash record: `live-baseline/routes.json` (script `capture_live_baseline.py`). All five live preview hashes match the local baseline previews.
- Review demo: [19-second MP4](telecom-microwave-dish-elevation-nut-material-review.mp4); source `make_demo.py`, slides in `slides/`.
- Frame review: run `verification/inspect-video.sh` to decode five frames into `video-review/` (regenerable, not tracked).
- No dated comparison against other catalog websites was recorded for this round.

## Change

In `telecom-infrastructure/microwave-dish-antenna`, `elevation-nut` used the `powderCoat`
control, which is labelled "Outdoor radio unit (powder-coated)". The nut sits on the
galvanized elevation strut of the fine-adjust mount; it is mount hardware, not part of the
radio unit. It rendered teal on a grey strut and turned yellow with the radio unit in the
`highVisibility` preset. It now uses `galvanizedSteel`, like the strut, collars and arms.
Geometry, envelope, triangle count (1,486 / 1,800), all four colour controls and both
presets are unchanged.

## Verification

- Focused exported-GLB regression: failed on the old source
  (`verification/focused-test-before.txt`, `elevation-nut` found in the `powderCoat` zone),
  1/1 passed after (`verification/focused-test.txt`).
- ESLint on `catalog/kits/telecom-infrastructure/` and the new test: exit 0
  (`verification/lint.txt`).
- `npx vitest run tests/integration/catalog/` passed 78 files and 128 tests in 726 s
  (`verification/vitest-catalog.txt`).
- Index rebuild exit 0 (`verification/build-index.txt`). The generated diff changes only the
  `telecom-infrastructure/microwave-dish-antenna` row: `sourceSha256` and the move of
  `elevation-nut` from the `powderCoat` palette zone to `galvanizedSteel`.
- `python3 scripts/checkCatalogQuality.py`: telecom-infrastructure 56/56; whole catalog
  2,400/2,402, the same as before this round (`verification/quality-gate.txt`).
- The MP4 was inspected from decoded full-size frames. The before and after nut colour and
  the evidence boundary are readable.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts microwave-dish-antenna
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/telecom-infrastructure/ tests/integration/catalog/microwaveDishElevationNutMaterial.test.ts
npx vitest run tests/integration/catalog/microwaveDishElevationNutMaterial.test.ts
npx kernelcad render inspect catalog/kits/telecom-infrastructure/microwave-dish-antenna.kcad.ts /tmp/dish \
  --focus elevation-nut,elevation-strut,collar-upper,collar-lower,arm-upper-l,arm-upper-r,arm-lower-l,arm-lower-r,bridge-upper,bridge-lower,odu-housing,pole
python3 artifacts/catalog-demos/telecom-microwave-dish-elevation-nut-material-review-20261114/make_demo.py
```

## Evidence boundary

This is a generic native kernelCAD material-assignment correction. The local source,
software-rendered inspection views, exported-GLB colour regression and generated index are
branch evidence. The default catalog preview does not show the change. The public page
still serves the captured baseline; this branch is not deployed. No vendor design or
hardware acceptance is claimed. The elevation strut still passes through the radio-unit
housing; see the ledger.
