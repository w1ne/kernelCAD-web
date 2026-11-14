# Baghouse dust collector semantic correction — 2026-11-10

**Demo:** [15-second local source-to-preview MP4](industrial-plant-baghouse-semantic-review.mp4) · [poster](poster.png) · [before public preview](before/baghouse-dust-collector.png) · [after local preview](after/baghouse-dust-collector.png) · [five-preview audit sheet](preview-review/five-rendered-previews.png)

This in-place correction retains `industrial-plant/baghouse-dust-collector` and the existing catalog counts. The [ledger](preview-review.md) records all five rendered assets reviewed and the separate bucket-elevator issue deferred for a later round.

## Finding and change

The before preview placed six filter tubes above the closed plenum, showed a detached short hopper and had supports that stopped below the collector body. The source now places the filter media inside the plenum, tapers four hopper walls into a discharge throat and extends four supports to the body. The visible steel and safety-paint controls retain the `weathered` and `highVisibility` palettes. The default model is **552 triangles / 1,400 budget**.

The regression test checks the exported GLB: all six filter bags stay within the plenum's vertical bounds, the front hopper wall narrows from top to bottom, the expected hopper and outlet parts use the steel palette, and the model remains within its triangle budget. No IDs, kit membership or counts changed.

The [public preview](https://kernelcad.com/assets/industrial-plant-baghouse-dust-collector.png) and [source](https://kernelcad.com/assets/industrial-plant-baghouse-dust-collector.kcad.ts) were checked before editing; both matched the retained pre-edit local snapshots byte-for-byte. The [after source](after/baghouse-dust-collector.kcad.ts), [before index row](before/index-row.json), five before sources and previews, and [hash manifest](preview-review/hashes.json) are retained here.

## Verification

- Preview render: **552 triangles**; after image inspected locally.
- Generated index: [verification report](index-verification.json) records all source hashes and preview references, the changed row and unchanged asset IDs/count.
- Mechanical quality gate: industrial-plant **60/60 (100.00%)**; catalog **2,402/2,402 (100.00%)**. This structural gate does not prove semantic realism.
- ESLint: passed. Focused exported-GLB regression: **1 test passed**. Full catalog integration suite: **8 files / 19 tests passed**, including the full-catalog export and index freshness check. Logs are retained alongside this README.
- Local static page: [generated detail page](local-page/catalog/industrial-plant/baghouse-dust-collector/index.html) and [matching preview](local-page/catalog/industrial-plant/baghouse-dust-collector/preview.png).
- [Audit ledger](preview-review.md) records the five visual checks, the one corrected mismatch, three unchanged previews and the deferred bucket-elevator finding.

## Reproduce

Run from the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts baghouse-dust-collector
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/verify_asset_index.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-industrial-plant-pages
python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/verify_local_pages.py
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/baghouseDustCollectorFidelity.test.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/capture_demo.py
```

The [demo capture source](capture_demo.py) and [settings](demo-settings.json) retain the five-frame layout, encoder settings and exact invocation. [Decoded-frame review](video-review/contact-sheet.png) and [inspection output](video-review/inspection.json) record the MP4 check. The inspected encode is H.264, 1280×720, 15 seconds; five frames were decoded and reviewed.

## Evidence limits

The MP4 shows local source edits, catalog software rendering and local validation. This branch is not deployed; the after render is not live-site behavior. No manufacturing performance or physical equipment acceptance is claimed. The dated official comparison notes are retained privately in `kernelCAD-private`.
