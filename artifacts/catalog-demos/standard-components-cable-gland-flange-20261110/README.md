# Useful cable and bore choices — standard-components

**Demo:** [source-to-preview MP4](standard-components-cable-gland-flange.mp4) · [poster](poster.png) · [three-preview review](preview-review/three-previews.png) · [decoded video contact sheet](video-review/contact-sheet.png) · [visual review](video-review/visual-review.md)

This local refinement improves two existing standard-components assets in
place. The cable gland's 4/6/8 mm cable choice changes the cable, seal opening
and body bore while preserving the nominal cable diameter across housing sizes.
Its molded polymer barrel, stainless compression cap, rubber seal and PVC cable
each have a material control. The square mounting flange's 10/14/18 mm choice
changes the actual bore while preserving it across housing sizes; its cast
base, stainless neck, rubber neck seal and zinc-plated fasteners are separate
colored parts. Both
retain their compact/standard/large scaling and named appearance presets.

## Changes and results

- Refined `standard-components/cable-gland` and
  `standard-components/square-mounting-flange`; no asset IDs or kits were added.
- Each asset now has four material-named controls. The kit average rises from
  **2.58 to 2.66 controls per asset**; the standard-components gate remains
  **50/50 passing**. The catalog remains **2,402/2,402 passing (100.00%; 50
  rich kits, zero thin kits)**.
- Default meshes are **812/900** triangles for the cable gland and **764/860**
  for the flange. The gland's first 720-triangle cap was exceeded at 812, so the
  cap was raised to 900. The flange was measured at 764 and has an 860 cap.
- All **50/50** standard-components previews were regenerated, then
  `catalog/index.json` was rebuilt so source hashes and preview paths match.
- Ten source-driven variant renders verify 4/8 mm cable, 10/18 mm flange
  bore, fixed nominal openings across compact/large housing sizes, and the
  `highVisibility` / `brass` palettes. Each render stays within its model's
  triangle budget.
- The local static pages expose the new parameter and preset choices and copy
  the matching previews. ESLint passed; the catalog integration suite passed
  all 15 tests across four files. Command output and page checks are retained in
  this bundle.
- The 18-second MP4 is **1280×720 at 24 fps**. It shows source previews,
  opening choices, housing scale, palettes and local verification.

## Reproduce

Run from the repository root:

```sh
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
npx tsx artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/render_variants.ts
npm run catalog:pages
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/verify_asset_index.py
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/verify_local_pages.py
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/make_preview_review.py
python3 scripts/checkCatalogQuality.py --kit standard-components
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/capture_demo.py
python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/inspect_video.py
```

The prior sources and previews are in [`before/`](before/), updated source
snapshots are in [`source/`](source/), and the exact variant inputs and video
settings are in [`demo-settings.json`](demo-settings.json).
[`render_variants.ts`](render_variants.ts) applies choices through
`variantSource`, exports each source as a low-poly GLB and uses the catalog
software renderer. [`index-verification.json`](index-verification.json) records
the changed source hashes, preview hashes, triangle counts, controls and
presets. The local page check records generated-page contents; it does not
claim deployed behavior.

## Visual review and limits

The three regenerated previews were opened and are retained in
[`preview-review/three-previews.png`](preview-review/three-previews.png). The cable gland reads as a ribbed
orange polymer fitting with a silver compression cap, black seal and blue cable
stub. The flange reads as a blue-gray square cast base with a pale bored neck,
dark neck seal and all four installed silver fasteners. The bulkhead-adapter
cross-check remains a separate brass barrel with its locknut and sealing ring.
The ten alternate renders visibly change the openings, housing envelopes or
part colors.

The current public kernelCAD library already lists the existing asset family;
this branch changes source and local generated pages only. The branch is not
deployed, so no updated live-page behavior is claimed. The dated comparison of
official parametric-CAD workflows is retained privately. These models are
generic low-poly visualizations, not vendor dimensions, fit verification,
manufacturing specifications or physical acceptance evidence.
