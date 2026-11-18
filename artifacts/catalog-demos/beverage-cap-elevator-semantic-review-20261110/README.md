# Cap elevator semantic correction — beverage bottling line

**Demo:** [local source-to-preview MP4](beverage-cap-elevator-semantic-review.mp4) · [poster](poster.png) · [before preview](before/cap-elevator.png) · [after preview](after-cap-elevator.png) · [five-asset audit sheet](preview-review/five-rendered-previews.png) · [decoded video review](video-review/contact-sheet.png)

This review fixes one material semantic mismatch in the existing `beverage-bottling-line/cap-elevator` asset. The old preview had a material mismatch: an opaque gray shroud dominated the image and hid the differently colored belt web and six food-polymer cleats, so the lift read as a cabinet. The updated preview exposes a tall cleated belt from an open hopper to a discharge chute, with support frame, rollers, drive motor, and separate controls for stainless steel, powder coat, food polymer, and belt rubber. Both existing appearance presets include the belt material. The mesh is 516 triangles under its unchanged 2,200-triangle budget.

## Audit and result

Five rendered assets were inspected: jaw-crusher-module, belt-filter-press, bottle-case-packer, bottle-rinser-carousel, and cap-elevator. The first four matched their labels well enough to leave unchanged. The fifth had a clear mismatch: its concealed belt flights and opaque enclosure made the object read as a plain cabinet. The [ledger](preview-review.md) records the selection and findings. Assets already targeted by current open semantic-fix work were excluded.

No asset IDs or kits were added. All **50** beverage-bottling-line previews were regenerated, and `catalog/index.json` was rebuilt to refresh source hashes and preview paths. The kit quality gate remains **50/50 (100%)**; the catalog gate remains **2,402/2,402 (100%; 50 rich kits, zero thin kits)**. The gate is structural and does not prove realistic geometry. The focused rendering regression asserts the exposed cleats, material controls, presets, and budget. See retained lint, quality, index and page checks, and catalog integration output in this bundle.

## Reproduce

Run these commands from the repository root:

```sh
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
npm run catalog:pages
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/verify_asset_index.py
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/verify_local_pages.py
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/make_preview_review.py
npx tsx artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/render_variants.ts
python3 scripts/checkCatalogQuality.py --kit beverage-bottling-line
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/beverage-bottling-line/ tests/integration/catalog/capElevatorSemantic.test.ts artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/render_variants.ts
npx vitest run tests/integration/catalog/ --maxWorkers=1
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/capture_demo.py
python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/inspect_video.py
```

The renderer invocation is retained in `render_kit_previews.py`. The initial and updated source/preview are retained in `before/`, `source-cap-elevator.kcad.ts`, and `after-cap-elevator.png`. `demo-settings.json` records both palette presets and video settings. `render_variants.ts` applies preset values through `variantSource`, exports GLBs, and uses the catalog software renderer. `index-verification.json` contains refreshed hashes, indexed path, parameters, presets, and triangle count.

## Evidence limits

The 15-second MP4 shows local software-rendered previews and local generated-page/test evidence only. The current branch is not deployed. This is a low-poly visualization, not a vendor drawing or validated machine design; local replay, catalog simulation/rendering, deployed behavior, and hardware acceptance are separate claims. No deployed behavior or physical acceptance is asserted here. Official equipment comparisons informed visible anatomy and are recorded privately; vendor dimensions or performance claims were not imported.
