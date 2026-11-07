# Fire-rescue PPE silhouette refinement — 2026-11-06

**Demo:** [24-second before/after and variant walkthrough](fire-rescue-ppe-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

The quality gate already passed all 60 fire-rescue assets, but three personal-protective-equipment props still used only axis-aligned `box()` stacks and read as blocks in their previews (72, 168 and 48 triangles). This follow-up rebuilt them in lofted source geometry. It adds no kit or asset IDs and does not count these edits as promotions from thin assets.

## Results

- **Structural fire boots:** lofted 14-point footprints for the outsole, foot upper, toe cap and heel counter; separate heel block and four forefoot lugs; tall flared shafts with a reflective band, padded collar and two pull-on loops. Shaft height choice 220/300/360 mm. Default render **1,224 / 2,200** triangles.
- **Firefighter gloves:** elliptical lofts along arbitrary axes for a domed back of hand, four two-segment fingers of graded length that fan and curl down at the tips, and an angled two-segment thumb; knuckle pad, grip-leather palm, wrist strap and tab. Cuff choice is a flared gauntlet with reflective band or a short knit wristlet; both have a dark open end. Default render **1,264 / 2,200** triangles (wristlet 1,152).
- **Firefighter hood:** a 16-point lofted balaclava with a fuller back of skull and rounded crown, over a flared short or long bib with a stitched hem; an elastic face band frames a domed display-headform face, plus nape label and crown seam. Default render **736 / 2,200** triangles.
- Each source now has four material-named colour controls (previously two): **+6 colour controls** across the three assets. Existing `weathered` and `highVisibility` presets were extended to cover the new materials and the hood gained a `carbonKnit` preset: **+1 preset name**.
- The quality gate remains **2,390/2,390 assets passing (0 thin)**; fire-rescue **60/60**. ESLint and the catalog integration suite results are in the output files beside this README.

[before/](before/) keeps the original source and preview bytes. [variants/](variants/) holds default, shape-choice, weathered and highVisibility renders from the same source ([variant-renders.json](variant-renders.json) records values, triangle counts and source hashes). The boots' 220 mm shaft variant is a modest visual change at preview size.

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts structural-fire-boots firefighter-gloves firefighter-hood
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/fire-rescue-ppe-silhouette-20261106/render_fire_rescue_ppe_variants.ts
    python3 artifacts/catalog-demos/fire-rescue-ppe-silhouette-20261106/capture_fire_rescue_ppe_demo.py
    python3 scripts/checkCatalogQuality.py --kit fire-rescue
    npx eslint catalog/kits/fire-rescue/
    npx vitest run tests/integration/catalog/

Dated comparable product-form research is kept private. The branch is not deployed. These are stylized scene props; no PPE certification, protective performance, sizing or fit is claimed.
