# Palletizer robot cell semantic correction — 2026-11-27

**Demo:** [local audit-to-preview MP4](industrial-plant-palletizer-robot-cell-semantic-review.mp4) · [before preview](before/palletizer-robot-cell.png) · [after preview](after/palletizer-robot-cell.png) · [five-preview audit](preview-review/ledger.md)

## Finding and change

The previous `industrial-plant/palletizer-robot-cell` preview showed large solid panels and a blocky center, hiding the robot and the carton flow. The baseline source and preview were snapshotted from `origin/develop`; hashes for all five reviewed source and preview pairs are recorded in [preview-review/hashes.json](preview-review/hashes.json).

The existing asset now shows a static palletizing cell with a posed robot, separate steel base and safety-painted arm, open mesh guard and access gate, eleven crosswise infeed rollers, a carton on the conveyor, and a timber pallet carrying eight cartons. Its controls are `concrete`, `steel`, `safetyPaint`, and `carton`, with `weathered` and `highVisibility` presets. The asset renders at 7,777 triangles under its 12,000-triangle budget. No ID or catalog count was added.

The model shows one display pose. It makes no claim about motion, cycle timing, reach, safety, manufacturing suitability, or physical equipment acceptance.

The five-preview ledger records the four unchanged assets and the single selected mismatch. PR #1258 was checked first and is merged with successful recorded CI. No matching open issue or pull request targeted this asset when selected. Current public kernelCAD page: [Palletizer robot cell](https://kernelcad.com/catalog/industrial-plant/palletizer-robot-cell/). This branch is not deployed, so that page still shows the prior version.

## Verification

- Focused GLB regression passed; it checks the material controls and presets, robot and work-cell dimensions, eleven roller axes, gate mesh, pallet load, and that the committed preview matches the rendered source. See [test and verification results](verification/integration-results.txt), [GLB](verification/palletizer-after.glb), and [asset entry](verification/asset-entry.json).
- ESLint passed for the industrial-plant kit and regression test; the command and result are included in [test and verification results](verification/integration-results.txt).
- The full catalog integration suite passed **225 files / 377 tests** with `--maxWorkers=4`, including the index freshness test. The default-concurrency run had two unrelated 60-second preview timeouts; both files passed an isolated 10-test rerun. All three outcomes are recorded in [test and verification results](verification/integration-results.txt).
- Asset-level quality gate: passed with four material-named controls and a preset block. The kit-level gate still reports the pre-existing `roller-conveyor-line` failure; its source matches `origin/develop`. The catalog-wide gate reports 2,396/2,402 (99.75%); all six listed thin assets match `origin/develop`. These structural counts do not measure semantic realism. See [quality-gate evidence](verification/quality-gate.json).
- Catalog index verification passed after generation: 2,402 source hashes and preview references are current, asset IDs and count are unchanged, and only the palletizer row changed. See [index verification](index-verification.json).
- The generated local detail page passed checks for the scene description, four controls, both presets, and an exact preview match. This is a source-build check only, not the public deployment. See [local page check](local-page-check.json).
- The [capture source](capture_demo.py), [demo settings](demo-settings.json), [video inspection](video-review/inspection.json), and [decoded contact sheet](video-review/contact-sheet.png) retain how the local demo was made and reviewed.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts palletizer-robot-cell
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/palletizerRobotCellFloorMaterial.test.ts
npx vitest run tests/integration/catalog/ --maxWorkers=4
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/palletizerRobotCellFloorMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant --top 5
python3 scripts/checkCatalogQuality.py
python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/verify_asset_index.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-palletizer-robot-cell-pages-20261127
python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/verify_local_page.py /tmp/kernelcad-palletizer-robot-cell-pages-20261127
python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/capture_demo.py
python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/inspect_video.py
```

All evidence describes a local software render of the checked-in source. It does not show deployed behavior, simulation results, or hardware acceptance.
