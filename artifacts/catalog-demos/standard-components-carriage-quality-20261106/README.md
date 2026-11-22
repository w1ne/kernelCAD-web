# Standard-components carriage detail follow-up — 2026-11-06

**Demo:** [linear-guide-carriage-quality.mp4](linear-guide-carriage-quality.mp4) · [poster](poster.png)

The video follows the existing `.kcad.ts` source through material controls, size and preset variants, the rendered three-quarter preview, and local checks. It shows the steel guide body and pad, dark polymer end wipers, four top mounting wells, and brass grease fitting. This is a stylized generic asset; the demo does not claim vendor dimensions, manufacturing suitability, deployed behavior, or physical acceptance.

## Follow-up result

- Updated one existing asset, `standard-components/linear-guide-carriage`; no kit or ID was added.
- The source keeps its compact / standard / large size choice and now exposes steel, engineering-polymer, and brass controls with `dark`, `brass`, and `weathered` presets.
- The underside guide channel remains open. Three-piece end wipers, four recessed mounting wells, and a raised grease fitting improve the catalog-angle silhouette.
- The mesh is **408 triangles** against a **460-triangle budget**.
- Kit and catalog quality pass rates, preview/index state, lint, integration results, and local page verification are recorded in [`verification.json`](verification.json) after the checks complete.

## Reproduce

From the repository root:

```sh
npx tsx scripts/checkCatalogAsset.ts catalog/kits/standard-components/linear-guide-carriage.kcad.ts --png /tmp/linear-guide-carriage.png
npx tsx artifacts/catalog-demos/standard-components-carriage-quality-20261106/render_carriage_variants.ts
python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
npm run catalog:pages
python3 scripts/checkCatalogQuality.py
python3 scripts/checkCatalogQuality.py --kit standard-components
npx eslint catalog/kits/standard-components/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/verify_local_page.py
python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/record_carriage_verification.py
python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/capture_carriage_demo.py
python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/inspect_carriage_video.py
```

The updated asset source is [linear-guide-carriage.kcad.ts](../../../catalog/kits/standard-components/linear-guide-carriage.kcad.ts). [`demo-settings.json`](demo-settings.json), [`render_carriage_variants.ts`](render_carriage_variants.ts), the before source and preview, and the recorded command outputs preserve the invocation and inputs.

## Verification

See [`verification.json`](verification.json), [`catalog-quality-output.txt`](catalog-quality-output.txt), [`kit-quality-output.txt`](kit-quality-output.txt), [`asset-check-output.txt`](asset-check-output.txt), [`preview-render-output.txt`](preview-render-output.txt), [`preview-index-check.json`](preview-index-check.json), [`eslint-output.txt`](eslint-output.txt), [`catalog-build-output.txt`](catalog-build-output.txt), [`catalog-index-check-output.json`](catalog-index-check-output.json), [`catalog-pages-build-output.txt`](catalog-pages-build-output.txt), [`catalog-integration-output.txt`](catalog-integration-output.txt), and [`local-page-check.json`](local-page-check.json). The catalog angle was visually checked after the final renderer pass; decoded MP4 frames and visual notes are in [`video-review/`](video-review/).

## Limits

The public homepage already describes a native parts-and-kits library with models opened in Studio. This branch has not been deployed. The asset is generic low-poly scene geometry; local checks establish source, mesh, preview, and catalog-index behavior only.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/capture_carriage_demo.py`
- video review: `python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/inspect_carriage_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
