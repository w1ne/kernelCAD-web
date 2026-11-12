# Grid-substation CVT divider insulation material review

This handoff records a five-preview semantic audit and a material-control correction to the capacitive voltage transformer asset. It includes the baseline source/render pairs, current public-page snapshots, the after source/render, regression and catalog verification outputs, and an inspected local MP4.

## Finding

The baseline CVT preview used the same dark green powder-coated-steel control for all four external divider sections and the secondary box. The correction adds a porcelain control and maps the four divider sections to it. The stainless-steel base and pedestal and powder-coated secondary box remain separate editable zones. The weathered and maintenance presets remain available and now set the porcelain finish explicitly.

Geometry did not change: 252 triangles within the 1,800-triangle budget and a 1.25 × 2.755 × 0.95 m envelope. The asset index still contains 2,402 assets across 50 kits and only the CVT row changed. The target source hash is `109268ee135c1a909592388f4ae6d92c6c9401979adc95a460a84e187a144e91` and its preview path is present.

## Five-preview audit

The [sample ledger](sample-ledger.json) records dimensions, baseline source and preview hashes, live-page checks, visible observations, and the result for each asset. Four previews showed coherent material zoning. The CVT divider stack was the only material mismatch found.

The [open issue and PR check](open-target-check.json) has no exact issue matches and no selected source-path matches in open PRs. PR #1258 was checked first at head `f9907bdbd76850c9bc0c460c50c19892bc8406c1`: all 17 reported checks succeeded and no review had been submitted. GitHub marked it conflicting with develop; this asset round does not resolve that branch conflict.

All five public detail routes and preview routes returned HTTP 200 before the source edit. Their public preview hashes match the saved local baseline previews byte for byte. The live CVT detail page exposed stainlessSteel and powderCoat, but no porcelain control. This branch is not deployed.

## Verification

- Focused exported-GLB regression: 1/1 passed. It checks all four divider colors, material group assignments, both presets, triangle budget, and unchanged envelope.
- ESLint: clean for the full grid-substation kit and the new regression.
- Catalog integration: 44 files and 69 tests passed, including the all-catalog source and index freshness check.
- Grid-substation structural quality gate: 80/80 assets passed (100%).
- Global structural scan: 2,401/2,402 assets passed (99.96%). The unchanged outlier is standard-components/beam-coupling; the grid-substation kit passes 80/80.
- Index verification: source hash matches, preview exists, all 2,402 assets and 50 kits remain, and only the CVT row changed.

The dated product-material comparison is retained privately. Public documentation describes only the native KernelCAD asset behavior.

## Evidence

- [Five-preview sample ledger](sample-ledger.json)
- [Open target audit](open-target-check.json)
- [Pre-change public route and preview verification](public-baseline/verification.json)
- [Before preview](previews/before/substation-capacitive-voltage-transformer.png)
- [After preview](previews/after/substation-capacitive-voltage-transformer.png)
- [Before source](source/before/substation-capacitive-voltage-transformer.kcad.ts)
- [After source](source/after/substation-capacitive-voltage-transformer.kcad.ts)
- [Generated index row verification](index-verification.json)
- [Focused regression output](verification-focused-regression.log)
- [Catalog integration output](verification-catalog-integration.log)
- [Inspected 11.2-second MP4 walkthrough](grid-substation-cvt-insulation-material-review.mp4)

The public site was not deployed. This local render and GLB evidence does not establish a vendor design, electrical rating, insulation performance, deployment, or physical acceptance.

## Reproduce

From the repository root, run:

    npx tsx scripts/renderCatalogPreviews.ts substation-capacitive-voltage-transformer
    npx tsx scripts/buildAssetCatalog.ts
    npx eslint catalog/kits/grid-substation/ tests/integration/catalog/substationCvtInsulationMaterials.test.ts
    npx vitest run tests/integration/catalog/substationCvtInsulationMaterials.test.ts
    npx vitest run tests/integration/catalog/
    PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit grid-substation
    PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-cvt-insulation-material-review-20261112/verify_asset_index.py
    PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-cvt-insulation-material-review-20261112/create_demo.py

The global structural scan result and its existing outlier are retained in verification-quality-global.log.
