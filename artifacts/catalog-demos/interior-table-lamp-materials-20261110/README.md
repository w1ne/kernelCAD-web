# Interior table-lamp materials and silhouette

This is an in-place refinement of the existing `interior/table-lamp` asset. It
adds no IDs or kits. The jar/column base choice remains; the exposed stem and
neck now read as brass hardware, with a visible side switch beneath the tapered
shade. Glazed ceramic, shade textile, and brass hardware have separate named
color controls. The `terracotta`, `midCentury`, and `monochrome` presets show
coordinated palettes.

The default mesh is 144 triangles under its 240-triangle budget. The interior
kit remains 72/72 assets passing and the global catalog quality gate is
**2,402/2,402 (100.00%; 50 rich kits, zero thin kits)**. No catalog count changed.
The local renders show a generic low-poly visualization; they do not establish
lighting output, electrical safety, manufacturing suitability, deployment, or
physical acceptance.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/verify_asset_index.py
npx tsx artifacts/catalog-demos/interior-table-lamp-materials-20261110/render_variants.ts
npx eslint catalog/kits/interior/
npx vitest run tests/integration/catalog/
npm run catalog:pages
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/verify_local_page.py
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/capture_demo.py
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/inspect_video.py
python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/audit_pack_contents.py
```

The dated comparison was recorded privately in
`kernelCAD-private/docs/competitors/2026-11-10-catalog-interior-table-lamp.md`.
The branch is not deployed; the local page check does not stand in for a public
deployment check.

## Review bundle

- Design intent: [design-brief.md](design-brief.md)
- Before source and preview: [before/](before/)
- Updated source copy: [source/table-lamp.kcad.ts](source/table-lamp.kcad.ts)
- Source-driven base-style and palette renders: [variants/](variants/) and
  [variant-manifest.json](variant-manifest.json)
- All 72 regenerated interior previews:
  [preview-render-output.txt](preview-render-output.txt)
- Generated index and source-hash evidence: [index-rebuild-output.txt](index-rebuild-output.txt),
  [index-verification.json](index-verification.json), and
  [quality-global-output.txt](quality-global-output.txt)
- Kit quality and lint: [quality-kit-output.txt](quality-kit-output.txt) and
  [eslint-output.txt](eslint-output.txt)
- Catalog integration: [integration-output.txt](integration-output.txt)
- Generated local page check: [local-page-check.json](local-page-check.json)
- npm package source/build boundary review: [package-boundary-audit.txt](package-boundary-audit.txt)
- Three interior preview review: [preview-review/three-previews.png](preview-review/three-previews.png)
- 12-second workflow demo: [interior-table-lamp-materials.mp4](interior-table-lamp-materials.mp4)
- Video contact sheet and decoded samples: [video-review/contact-sheet.png](video-review/contact-sheet.png),
  [video-review/decoded-samples.png](video-review/decoded-samples.png), and
  [video-inspection.json](video-inspection.json)

The demo uses source-driven `baseStyle` and preset values, low-poly GLB exports,
software-rendered PNGs, and local checks. It does not record a Studio session or
claim deployment, simulation, or hardware acceptance.
