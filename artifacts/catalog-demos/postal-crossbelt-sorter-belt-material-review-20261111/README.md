# Postal crossbelt sorter material review

This bundle records a five-preview semantic audit and a material/feature correction to the existing `postal-logistics/crossbelt-sorter-section` CC0 scene asset. No asset IDs or kits were added.

## Finding

The baseline preview showed four elevated molded-polymer carrier slabs with no visibly distinct crossbelt surfaces. Each tray body now carries a thin dark rubber surface, controlled by the material-named `beltRubber` parameter. The four carrier shells remain polymer and both existing finish presets include the rubber control.

The 8 mm belt surfaces sit within the original 0.775 × 0.84 × 1.18 m overall envelope. The updated preview is 960 triangles against the existing 1,800-triangle budget. Existing kit layout, asset ID, and scale control remain.

## Audit and evidence

- [Five-preview ledger](sample-ledger.json)
- [Open issue and PR target checks](open-target-check-output.json)
- [PR #1258 baseline state and checks](pr-baseline.json)
- [Public site baseline](live-site-baseline.json), including the downloaded [asset manifest](live-baseline/assets.json), [gallery manifest](live-baseline/gallery.json), [live source](live-baseline/crossbelt-sorter-section.kcad.ts), [live preview](live-baseline/crossbelt-sorter-section.png), and [live detail-page HTML](live-baseline/crossbelt-detail-page.html)
- Baseline sources: [five source snapshots](source/before/)
- Baseline renders: [five preview snapshots](previews/before/)
- Corrected source: [crossbelt-sorter-section.kcad.ts](source/after/crossbelt-sorter-section.kcad.ts)
- [Before preview](previews/before/crossbelt-sorter-section.png) and [after preview](previews/after/crossbelt-sorter-section.png)
- [Inspected MP4 walkthrough](postal-crossbelt-sorter-belt-material-review.mp4)
- [Demo source](create_demo.py), [render settings and commands](demo-settings.json), and [video inspection metadata](video-review/inspection.json)
- Dated official product-context comparisons are stored privately in `kernelCAD-private/docs/competitors/2026-11-11-postal-crossbelt-sorter-material-review.md`.

## Reproduce

From the repository root:

```bash
npx vitest run tests/integration/catalog/postalCrossbeltSorterMaterial.test.ts
npx eslint catalog/kits/postal-logistics/ tests/integration/catalog/postalCrossbeltSorterMaterial.test.ts
npx tsx scripts/renderCatalogPreviews.ts crossbelt-sorter-section
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/buildAssetCatalog.ts --check
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-postal-crossbelt-material-review
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-crossbelt-sorter-belt-material-review-20261111/verify_local_pages.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-crossbelt-sorter-belt-material-review-20261111/create_demo.py
```

`demo-settings.json` records the demo dimensions, duration, render and verification commands, and claim boundary. `create_demo.py` retains the video-generation source and invocation.

## Verification

The focused exported-GLB regression passes 1/1 and checks all four rubber belt colors, all four polymer carrier assignments, both preset values, the baseline envelope, and the triangle budget. The postal-logistics mechanical gate passes 52/52 (100%); ESLint is clean. The generated local detail page contains the new material control and preset values, and its copied preview hash matches the checked-in PNG. The regenerated index changes only the target row, whose source hash is fresh. `verification-*.log` files retain the regression, lint, preview render, index build, kit quality, and local page checks. `index-row-before.json`, `index-row-after.json`, and `index-diff-summary.json` preserve the generated index evidence without duplicating the full catalog index.

The public source and preview matched the audited local baseline at site generation `2026-11-11T17:45:06.972Z`; the live detail page also served the baseline page without `beltRubber`. This source-branch correction is not deployed. It does not claim vendor fidelity, operational performance, safety certification, dimensional conformity to a product, or physical acceptance.
