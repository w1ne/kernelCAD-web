# Grid-substation ground test well refinement

[Watch the 12-second local source-to-preview demo](grid-substation-ground-test-well.mp4).

This round repairs one remaining weak silhouette in the already-promoted
grid-substation kit. The old ground-grid test well preview read as a concrete
block with a small copper knob. The existing asset now has:

- A hollow precast chamber with a 360, 480, or 620 mm depth choice.
- A raised collar, separate beveled stainless-steel hatch, fastening points,
  and lift grip.
- Side conduit sleeves and a clamped copper test terminal.
- Three independent material controls: concrete, stainless steel, and copper.
- Weathered and maintenance palettes that each update all three materials.

The default model uses 1,128 triangles under the unchanged 1,800-triangle
budget. The same source-driven mesh size is 1,128 triangles at all three depth
choices; measured model heights are 608, 728, and 868 mm. The source keeps the
existing asset ID, CC0 license, scale control, and material controls. No kit or
asset was added.

## Verification

- Re-rendered all 80 grid-substation preview images, then regenerated
  catalog/index.json.
- The generated index source hash, preview path, depth choices, three color
  controls, presets, and triangle budget match the edited source.
- The quality gate remains **80/80 grid-substation assets passing** and
  **2,402/2,402 assets passing (100.00%; 50 rich kits, 0 thin kits)** across
  the catalog. This round did not increase either count.
- ESLint passed for the grid-substation kit.
- The catalog integration suite passed **4 files and 15 tests** after the final
  source and generated index were in place; the complete output is recorded in
  catalog-integration-output.txt.
- The local catalog builder generated the hub and all 2,402 asset pages. The
  ground test well detail page contains its preview, depth choice, material
  controls, named presets, and Studio link.
- The 360, 480, and 620 mm source variants render to distinct images with
  strictly increasing heights. The maintenance palette changes the rendered
  image. All four variant meshes remain within the 1,800-triangle budget.
- Three grid-substation previews were opened and visually checked. The
  ground test well reads as an inspection chamber with a metal hatch, visible
  side conduits, and a copper test point; the bay identification post reads as
  a sign post, and the capacitive voltage transformer reads as a stacked
  insulator and terminal assembly.
- The MP4 was decoded and inspected. It shows the before/after silhouette,
  real depth variants, the maintenance finish, and local verification.

The source-driven catalog renderer produced the preview and variant images.
KernelCAD's render-inspection command was also attempted by attaching to both
already-running CDP sessions, but each connection timed out before capture.
No new browser was started and both existing Chrome sessions were left running.

This branch is not deployed. The current public row is the pre-change baseline;
the updated public page and preview still need verification after deployment.
These are generic visualization props and do not establish grounding
performance, conductor sizing, electrical-code compliance, field safety, or
physical acceptance.

## Rebuild and verify

Run from the repository root:

~~~sh
xargs -a artifacts/catalog-demos/grid-substation-ground-test-well-20261110/kit-preview-asset-ids.txt npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-ground-test-well-20261110/verify_asset_index.py
npx tsx artifacts/catalog-demos/grid-substation-ground-test-well-20261110/render_variants.ts
python3 scripts/checkCatalogQuality.py --kit grid-substation
python3 scripts/checkCatalogQuality.py
npx eslint catalog/kits/grid-substation/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-grid-substation-ground-test-well-20261110
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-ground-test-well-20261110/verify_local_page.py /tmp/kernelcad-grid-substation-ground-test-well-20261110
python3 artifacts/catalog-demos/grid-substation-ground-test-well-20261110/capture_demo.py
python3 artifacts/catalog-demos/grid-substation-ground-test-well-20261110/inspect_video.py
~~~

## Review bundle

- Design intent and invocation settings: design-brief.md and demo-settings.json.
- Previous source and preview: before/.
- Updated source snapshot: source/.
- Four source-driven renders and measured dimensions: variants/ and
  variant-manifest.json.
- Full 80-preview render log: catalog-preview-render-output.txt.
- Generated index log and source-hash verification:
  catalog-index-build-output.txt and index-verification.json.
- Quality and lint results: quality-kit-output.txt,
  quality-global-output.txt, and eslint-output.txt.
- Catalog integration result: catalog-integration-output.txt.
- Local static page build and check: catalog-pages-build-output.txt,
  catalog-pages-check-output.txt, and local-page-check.json.
- MP4 capture source, decoded contact sheet, samples, and inspection record:
  capture_demo.py, video-review/, and video-inspection.json.
