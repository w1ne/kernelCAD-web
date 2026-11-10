# Vertical turbine pump head refinement

This is an in-place refinement of the existing
`water-treatment/vertical-turbine-pump` asset. It adds no catalog IDs or kits.

## What changed

- `outletOrientation` selects front, right, rear, or left. The discharge neck,
  flange, face, and eight bolts rotate together around the fixed pump head. The
  front/right source renders swap their measured width/depth from 650 × 769 mm
  to 769 × 650 mm.
- The preview now shows the column foot and head flanges, broad discharge head,
  side nozzle, bolted outlet face, motor pedestal, six cooling ribs, fan cowl,
  and terminal box.
- Four separately editable material controls distinguish coated pump steel,
  structural steel, stainless steel, and motor finish. The existing `weathered`
  and `highVisibility` presets set all four materials.
- The default mesh is 2,276 triangles under the updated 2,800-triangle budget.
  The water-treatment kit stays at 50 assets and the global quality gate stays
  at **2,402/2,402 (100.00%; 50 rich kits, zero thin kits)**.

These are generic low-poly scene visuals. They do not specify a vendor pump's
dimensions or ratings, pump or treatment performance, process safety,
installation suitability, manufacturing readiness, or physical acceptance.

## Reproduce

From the repository root:

```sh
python3 -c 'import pathlib,subprocess; ids=sorted(p.name.removesuffix(".kcad.ts") for p in pathlib.Path("catalog/kits/water-treatment").glob("*.kcad.ts")); subprocess.run(["npx","tsx","scripts/renderCatalogPreviews.ts",*ids],check=True)'
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/water-treatment-vertical-turbine-pump-quality-20261110/verify_asset_index.py
npx tsx artifacts/catalog-demos/water-treatment-vertical-turbine-pump-quality-20261110/render_variants.ts
npx eslint catalog/kits/water-treatment/
npx vitest run tests/integration/catalog/
npm run catalog:pages
python3 artifacts/catalog-demos/water-treatment-vertical-turbine-pump-quality-20261110/verify_local_page.py
python3 artifacts/catalog-demos/water-treatment-vertical-turbine-pump-quality-20261110/capture_demo.py
python3 artifacts/catalog-demos/water-treatment-vertical-turbine-pump-quality-20261110/inspect_video.py
```

The exact four variant inputs, render settings, canvas, captions, checks, and
claim limits are in [demo-settings.json](demo-settings.json); design intent is
in [design-brief.md](design-brief.md). The dated comparison is private in
`kernelCAD-private/catalog-water-treatment-vertical-turbine-pump-quality-20261110/COMPARISON.md`.

## Review bundle

- Updated source copy: [source/vertical-turbine-pump.kcad.ts](source/vertical-turbine-pump.kcad.ts)
- Before source and preview: [before/](before/)
- Four source-driven renders and measured bounds: [variants/](variants/) and
  [variant-manifest.json](variant-manifest.json)
- All 50 regenerated water-treatment previews:
  [preview-render-output.txt](preview-render-output.txt)
- Generated index build and source-hash check:
  [index-rebuild-output.txt](index-rebuild-output.txt) and
  [index-verification.json](index-verification.json)
- Quality audit: [quality-kit-output.txt](quality-kit-output.txt) and
  [quality-global-output.txt](quality-global-output.txt)
- Lint and catalog integration results:
  [eslint-output.txt](eslint-output.txt) and
  [integration-output.txt](integration-output.txt)
- Generated local page check:
  [local-page-check.json](local-page-check.json) and
  [catalog-pages-output.txt](catalog-pages-output.txt)
- Three-preview visual review: [preview-review/three-previews.png](preview-review/three-previews.png)
- Local workflow video:
  [water-treatment-vertical-turbine-pump-quality.mp4](water-treatment-vertical-turbine-pump-quality.mp4)
- Video contact sheet: [video-review/contact-sheet.png](video-review/contact-sheet.png)
- Decoded video samples: [video-review/decoded-samples.png](video-review/decoded-samples.png)
- Video inspection record: [video-inspection.json](video-inspection.json)

The local demo uses source-driven geometry and palette variants, software
renders, the generated index, and local page/check results. No simulation was
run. This branch is not deployed and no physical or hardware acceptance is
claimed.
