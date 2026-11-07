# Hydroponics catalog wave

[Watch the 30-second source-to-preview walkthrough](hydroponics-kit.mp4).

The video shows a real `nutrient-reservoir-tank.kcad.ts` source and its generated preview, then all 52 catalog previews across seven contact sheets. Its final frame reports the local catalog checks. The recording uses locally generated catalog artifacts; production visibility and horticultural suitability are separate.

## Results

- Added 52 original hydroponics assets in a new kit. The generated catalog contains 1,795 indexed assets in 41 kits.
- Rendered all 1,795 catalog previews, then rebuilt the index. Every row has an indexed preview path backed by a PNG.
- All 52 hydroponics sources build, expose exactly `scale` and `color`, export one material, start at z=0, and remain inside their 1,800-triangle budgets. Indexed meshes range from 128 to 372 triangles.
- `npx eslint catalog/` passed over the 1,795 source files with zero errors and warnings.
- `npx vitest run tests/integration/catalog/` passed all 4 files and 15 tests. The suite rebuilt all indexed sources, checked the source hashes, parameter lists, mesh budgets, one-material exports, and Studio opening behavior.
- The preview audit found 1,795 preview fields backed by 1,795 PNGs, with no missing paths or files.
- Local static page generation wrote 1,795 asset pages and the hub; all 52 hydroponics pages contain the asset title, parameters, and preview, and the hub lists the kit.
- `npm run build` passed. Its existing `verb-nurbs` dependency emitted a warning about `NaN` equality. `npm pack --dry-run --ignore-scripts --json` included all 52 hydroponics sources and previews plus the generated catalog index; the audit found no product-specific paths, kept the `./package.json`-only export, wrote no tarball, and ran no lifecycle scripts.
- At 2026-11-03 06:05 UTC, the production homepage and `/assets.json` returned HTTP 200 with 1,291 rows, all 1,291 carrying previews, and no hydroponics rows. This feature branch is not deployed, so production visibility remains unverified.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/hydroponics-wave-20261103/generate_hydroponics_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/hydroponics-wave-20261103/verify_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-hydroponics-pages-wave-20261103
python3 artifacts/catalog-demos/hydroponics-wave-20261103/verify_hydroponics_pages.py /tmp/kernelcad-hydroponics-pages-wave-20261103
npm run build
npm pack --dry-run --ignore-scripts --json > artifacts/catalog-demos/hydroponics-wave-20261103/npm-pack-dry-run.json
node artifacts/catalog-demos/hydroponics-wave-20261103/audit_npm_pack.mjs
python3 artifacts/catalog-demos/hydroponics-wave-20261103/capture_hydroponics_demo.py
python3 artifacts/catalog-demos/hydroponics-wave-20261103/inspect_hydroponics_video.py
```

The bundle retains the generator, command settings, full-catalog build output, integration output and summary, lint output and summary, preview audit, local page build and check, production baseline, npm build and dry-run package audit, source frames, decoded video review sheet, and MP4.

## License and scope

All models are original kernelCAD geometry dedicated under CC0 1.0. They are visualization props. The catalog checks do not establish crop performance, greenhouse compliance, food-contact suitability, chemical compatibility, sensor calibration, equipment ratings, or physical acceptance.
