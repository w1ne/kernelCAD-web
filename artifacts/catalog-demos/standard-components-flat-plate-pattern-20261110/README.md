# Flat joining plate hole-pattern refinement

This is an in-place refinement of the existing
`standard-components/flat-joining-plate` asset. It adds no catalog IDs or kits.

## What changed

- `holeCount` selects three, four, or five in-line holes. The plate length,
  native through-bores, and number of installed fasteners change together.
- The standard layout keeps the original 20 mm pitch and 12 mm outer margin,
  producing 64, 84, and 104 mm lengths. Compact and large still scale the whole
  assembly.
- The two existing material controls and three palettes remain. The default is
  now blue painted steel with contrasting silver zinc-plated fasteners; the
  existing `brass` palette gives the fasteners a second appearance.
- Measured variants use 432, 572, and 712 triangles. The source budget is 800,
  leaving room for the five-hole layout without decimation.

These dimensions describe generic visualization geometry. They are not a
standard, vendor design, fit recommendation, or manufacturing specification.

## Reproduce

From the repository root:

```sh
python3 -c 'import json,subprocess; ids=json.load(open("catalog/kits/standard-components/demo/settings.json"))["previewAssetIDs"]; subprocess.run(["npx","tsx","scripts/renderCatalogPreviews.ts",*ids],check=True)'
npx tsx scripts/buildAssetCatalog.ts
npx tsx artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/render_variants.ts
python3 artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/verify_asset_index.py
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
npm run catalog:pages
python3 artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/verify_local_page.py
python3 artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/capture_hole_count_demo.py
python3 artifacts/catalog-demos/standard-components-flat-plate-pattern-20261110/inspect_video.py
```

The exact variant choices, canvas size, captions, tool invocations, geometry
assumptions, and claim limits are in [demo-settings.json](demo-settings.json).
The design intent is recorded in [design-brief.md](design-brief.md).

## Review bundle

- Updated source copy: [source/flat-joining-plate.kcad.ts](source/flat-joining-plate.kcad.ts)
- Before source and preview: [before/](before/)
- Four source-driven renders and measured dimensions: [variants/](variants/) and
  [variant-manifest.json](variant-manifest.json)
- Full kit preview render output: [preview-render-output.txt](preview-render-output.txt)
- Generated index source-hash and parameter check:
  [index-verification.json](index-verification.json)
- Local catalog page check: [local-page-check.json](local-page-check.json)
- Quality audits: [quality-kit-output.txt](quality-kit-output.txt) and
  [quality-global-output.txt](quality-global-output.txt)
- Kit lint: [eslint-output.txt](eslint-output.txt)
- Catalog integration results: [integration-output.txt](integration-output.txt)
- Initial integration comparison and generated-index rebuild evidence:
  [integration-first-run-output.txt](integration-first-run-output.txt) and
  [index-rebuild-output.txt](index-rebuild-output.txt)
- Completion summary: [verification-summary.txt](verification-summary.txt)
- Local workflow video: [standard-components-flat-plate-pattern.mp4](standard-components-flat-plate-pattern.mp4)
- Video contact sheet: [video-review/contact-sheet.png](video-review/contact-sheet.png)
- Decoded video samples: [video-review/decoded-samples.png](video-review/decoded-samples.png)
- Video inspection record: [video-inspection.json](video-inspection.json)

The current quality gate remains **2,402/2,402 assets passing (100.00%; 50
rich kits, zero thin kits)**; `standard-components` remains **50/50 passing**.
No asset count increased. The dated workflow comparison is recorded privately
in `kernelCAD-private`.

The first integration run found a two-triangle stats difference for the
unmodified `grid-substation/substation-bus-post-insulator` row. The generated
index was rebuilt and the full integration suite rerun; the final run passes
all 15 tests, including the byte-for-byte catalog rebuild comparison. Both
runs and the generator output are retained above.

The video and page checks use local source, local renders, the generated index,
and local static pages. This feature branch is not deployed, so public live-page
verification remains pending deployment. These assets are generic low-poly
visualizations and do not establish supplier dimensions, manufacturing
suitability, hardware behavior, or physical acceptance.
