# Archaeology fieldwork catalog wave

[Watch the 30-second local workflow demo](archaeology-fieldwork-kit.mp4).

The video shows a native `shaker-screen.kcad.ts` source and its generated preview, preview contact sheets for all 50 kit assets, and the final local audit results. The preview images are actual catalog renders. It does not imply that this unmerged branch has been deployed. These are generic CC0 scene props, not archaeological procedures, calibrated instruments, historical reconstructions, or equipment accepted for field use.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/generate_archaeology_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-archaeology-fieldwork-pages
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/verify_archaeology_pages.py /tmp/kernelcad-archaeology-fieldwork-pages
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/check_catalog_previews.py
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/record_archaeology_checks.py
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/check_live_site.py
npm run build
npm pack --dry-run --json --ignore-scripts
mkdir -p /tmp/kernelcad-archaeology-fieldwork-npm-pack
npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-archaeology-fieldwork-npm-pack
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/audit_npm_pack.py /tmp/kernelcad-archaeology-fieldwork-npm-pack/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/record_demo_results.py
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/write_archaeology_readme.py
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/capture_archaeology_demo.py
python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/inspect_archaeology_video.py
```

The source generator is retained beside `settings.json`, which records its invocation, parameter ranges, geometry grounding rule, and verification scope. `catalog-preview-output.txt` records the full preview pass; `catalog-preview-corrections-output.txt` records the eight render updates made after visual review. The catalog index was rebuilt after both preview passes and before the final test run.

## Verification summary

- 50 new indexed sources; the branch index contains 1,641 assets.
- All 1,641 indexed assets have `preview` fields and matching PNG files. All 50 new kit previews appear in the index.
- The new kit exposes exactly `scale` and `color` knobs per asset. Meshes range from 48 to 932 triangles, use one material, rest at Z=0, and have fresh source hashes.
- Catalog integration suite: 4 files and 15 tests passed, including the all-assets mesh and Studio-knob checks.
- Full `eslint catalog/` passed. The local page builder generated 1,641 pages; all 50 new pages include previews and both knobs.
- The built `kernelcad@0.17.4` tarball contains 50 new sources and 50 previews. Its export map remains `./package.json`; the archive scan found no commercial product paths.
- The production build passed. It printed the existing `vendor/verb-nurbs` NaN-comparison warning.
- The MP4 is 30 seconds, 1280×720 at 24 fps; ten decoded samples and a contact sheet are retained in `video-review/`.

## Current live site and limits

On 2026-11-03, `https://kernelcad.com/` and `/assets.json` returned the current live catalog with 1,291 assets, all 1,291 carrying preview paths. This branch has 1,641 indexed assets and 1,641 previews, but it has not been deployed; the live site does not include this wave. Verify the deployed homepage and asset feed after merge. Local renders, generated pages, package contents, and the catalog suite do not establish archaeological method approval, instrument calibration, historical fidelity, or field acceptance.

Private dated comparator notes are stored outside this repository in `kernelCAD-private/catalog-archaeology-fieldwork-compare-20261103/`. The public kit and handoff describe only the native kernelCAD assets and checks.
