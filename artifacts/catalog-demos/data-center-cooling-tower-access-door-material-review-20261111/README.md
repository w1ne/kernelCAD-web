# Data-center cooling-tower access-door material review

This bundle records a five-preview semantic review and a material-control correction to the existing `data-center-infrastructure/cooling-tower-cell` asset. No catalog IDs or kits were added.

## Finding

The baseline render showed a light grey access panel on teal FRP casing. The source assigned the panel to the separate `stack` color control. The asset's material mapping now treats the access panel as part of the casing finish, so it follows `casing`; the fan stack remains independently controlled by `stack`.

The edit changes one material assignment. Geometry, dimensions, preset names, triangle count, asset identity, and triangle budget are unchanged. The local preview makes the panel finish consistent with the casing while preserving its seam and handle.

## Audit and evidence

- [Five-preview ledger](sample-ledger.json)
- [Open issue and PR target checks](open-target-check-output.json)
- [PR #1258 baseline status](pr-baseline.json)
- [Public kernelCAD site baseline](live-site-baseline.json), with the downloaded [asset list](live-baseline/assets.json) and [gallery list](live-baseline/gallery.json)
- Baseline sources: [source snapshots](source/before/)
- Baseline previews: [air-cooled chiller](previews/before/air-cooled-chiller.png), [cooling-tower cell](previews/before/cooling-tower-cell.png), [dry-type transformer](previews/before/dry-type-transformer.png), [standby generator enclosure](previews/before/standby-generator-enclosure.png), [clean-agent cylinder bank](previews/before/clean-agent-cylinder-bank.png)
- Corrected source: [cooling-tower-cell.kcad.ts](source/after/cooling-tower-cell.kcad.ts)
- [Before preview](previews/before/cooling-tower-cell.png) and [after preview](previews/after/cooling-tower-cell.png)
- [Inspected MP4 walkthrough](data-center-cooling-tower-access-door-material-review.mp4)
- [MP4 inspection metadata](video-review/inspection.json) and [inspected-frame montage](video-review/inspection-montage.png)
- A dated industry-reference comparison is retained privately in `kernelCAD-private`.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts cooling-tower-cell
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/data-center-infrastructure/ tests/integration/catalog/coolingTowerAccessDoorMaterial.test.ts
npx vitest run tests/integration/catalog/coolingTowerAccessDoorMaterial.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit data-center-infrastructure
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-cooling-tower-access-door-material-review-20261111/create_demo.py
```

`demo-settings.json` retains the render/index commands, video dimensions, frame rate, captions, and verification lines. `create_demo.py` retains the MP4 generation source and invocation.

## Verification

See the `verification-*.log` files for the focused exported-GLB regression, kit lint and quality gate, global quality scan, catalog integration suite, targeted preview render, and regenerated index.

`verification-catalog-integration-interrupted.log` is an earlier partial run stopped before the branch sync; the final result is in `verification-catalog-integration.log`.

The focused exported-GLB regression passed 1/1. ESLint completed cleanly, the data-center kit gate passed 50/50 (100%), and the catalog integration suite passed 39 files / 64 tests. The global mechanical scan reports 2,401/2,402 (99.96%); its single outlier is `standard-components/beam-coupling`.

The full index rebuild contains 2,402 assets across 50 kits and refreshed 542 source-hash rows against the synced source tree. Among the five reviewed data-center assets, only `cooling-tower-cell` changed. No asset IDs were added.

The public source and preview matched the pre-fix local baseline at site generation `2026-11-11T17:45:06.972Z`; the asset detail route returned HTTP 404. This correction is local to the feature branch and is not deployed. It does not claim vendor-specific design, cooling performance, fit, safety certification, or physical acceptance.
