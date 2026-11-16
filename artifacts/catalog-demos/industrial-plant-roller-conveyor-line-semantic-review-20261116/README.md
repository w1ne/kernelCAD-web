# Roller conveyor line semantic correction — 2026-11-16

**Demo:** [15-second local source-to-preview MP4](industrial-plant-roller-conveyor-line-semantic-review.mp4) · [before preview](before/roller-conveyor-line.png) · [after preview](after/roller-conveyor-line.png) · [five-preview audit ledger](preview-review.md)

## Finding and change

The pre-edit preview showed a solid steel deck with one yellow cylinder running lengthwise, although the asset was labeled as a gravity roller conveyor with repeated rollers. Its published source and preview matched the retained local before snapshots byte-for-byte on 2026-11-16; their hashes are in [preview-review/hashes.json](preview-review/hashes.json).

The existing `industrial-plant/roller-conveyor-line` asset now has an open bed of eleven crosswise steel rollers. The source keeps the side rails and six support legs connected, assigns rollers to a new `rollerSteel` control, and updates the description to match the modeled object. The `weathered` and `highVisibility` presets remain available. The default is **652 triangles / 1,400 budget**. The asset ID, kit membership, and catalog count are unchanged.

The [five-preview ledger](preview-review.md) records the four unchanged assets and the single selected mismatch. PR #1258 was reviewed first: it is merged with successful recorded CI checks and does not change these five asset sources. The open issue and pull-request lists had no matching asset target at selection time.

## Verification

- The exported-GLB regression checks all eleven roller axes, 80 mm spacing, the steel color assignment, the open bed, and the triangle budget. See [focused test output](verification/focused-test.log).
- The full catalog integration suite passed **126 files / 196 tests**; output is retained in [integration-suite.log](verification/integration-suite.log).
- ESLint passed for the industrial-plant kit and regression test.
- The regenerated index verifier passed for **2,402 source hashes and preview references**, found one changed row, and confirmed unchanged asset IDs. The target row points to the rendered preview and current source hash; details are in [index-verification.json](index-verification.json).
- Industrial-plant quality check: **60/60 (100.00%)**. The catalog-wide `checkCatalogQuality.py` run returned **2,398/2,402 (99.83%)** and lists four remaining assets in `standard-components`; the changed asset is not among them. These structural results do not measure semantic realism.
- The generated local detail page shows the updated description, roller-steel control, both presets, and a preview byte-for-byte equal to the rendered source output. See [local-page-check.json](local-page-check.json).
- The [video settings](demo-settings.json), [capture source](capture_demo.py), and [verification record](verification.json) retain the invocation and evidence limits.
- The encoded video is H.264 at 1280×720 for 15 seconds. Five decoded frames were inspected; the [inspection record](video-review/inspection.json) and [contact sheet](video-review/contact-sheet.png) retain that review.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts roller-conveyor-line
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/verify_asset_index.py
python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/record_public_hashes.py
npx vitest run tests/integration/catalog/rollerConveyorLineFidelity.test.ts
npx vitest run tests/integration/catalog/
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/rollerConveyorLineFidelity.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-roller-conveyor-line-pages-20261116
python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/verify_local_page.py /tmp/kernelcad-roller-conveyor-line-pages-20261116
python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/capture_demo.py
```

## Evidence limits

The MP4 and page check show local source, software rendering, and validation only. This branch has not been deployed, so the public page remains unchanged. No motion simulation, engineering performance, manufacturing suitability, or physical equipment acceptance is claimed.
