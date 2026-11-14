# Recycling facility catalog wave

[Watch the 30-second source-to-preview walkthrough](recycling-facility-kit.mp4).

The video shows the actual `optical-sorter-arch.kcad.ts` source and its generated preview, then representative generated previews across all seven kit sections. The last frame shows local catalog validation. The branch is not deployed; the video does not claim equipment specifications, process performance, operator safety, environmental compliance, or physical acceptance.

## Results

- Added 153 original recycling-facility assets. The generated catalog contains 2,000 indexed assets in 43 kits.
- Rendered all 2,000 catalog previews: 2,000 index rows carry previews backed by 2,000 PNGs. The new kit contributes 153 previewed assets.
- All 153 new sources load, expose exactly `scale` and `color`, export one material, and fit their 1,800-triangle budgets. Indexed meshes range from 108 to 436 triangles.
- `npx --silent eslint catalog/` passed over 2,000 model sources with zero errors and warnings.
- `npx vitest run tests/integration/catalog/` passed 4 files and 15 tests, including every source build, source hash, one-material mesh, triangle budget, parameter list, and Studio opening check.
- Local static catalog generation wrote 2,000 asset pages; all 153 new-kit pages contain the asset title, controls, and preview, and the hub lists the kit.
- `npm run build` passed. It emitted one warning from bundled `vendor/verb-nurbs` about comparing a value with `NaN` using `==`. The `npm pack --dry-run --ignore-scripts --json` audit found all 153 sources and previews plus the generated index, no product-specific paths, and only the `./package.json` export. It wrote no tarball and ran no lifecycle scripts.
- At 2026-11-03T10:22:43.447942+00:00, the live homepage and `/assets.json` returned HTTP 200 and 200 with 1,291 previewed rows and no recycling-facility rows. This branch is not deployed, so production visibility remains unverified.

## Rebuild and verify

Run from the repository root. This audit used Node v22.23.4 and the retained `node-preload.mjs` to supply the CommonJS globals required by the pinned Emscripten package under its ESM loader. `npm ci` rejected the existing package-lock/package.json mismatch; `npm install --package-lock=false --allow-git=all` installed dependencies without changing the lockfile. This is a local verification detail, not a lockfile change in the wave.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/generate_recycling_assets.py
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx eslint catalog/ --fix
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node artifacts/catalog-demos/recycling-facility-wave-20261103/render_recycling_previews.mjs
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/verify_previews.py
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-recycling-facility-pages-wave-20261103
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/verify_recycling_pages.py /tmp/kernelcad-recycling-facility-pages-wave-20261103
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npm run build
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npm pack --dry-run --ignore-scripts --json > artifacts/catalog-demos/recycling-facility-wave-20261103/npm-pack-dry-run.json
node artifacts/catalog-demos/recycling-facility-wave-20261103/audit_npm_pack.mjs
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/capture_recycling_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/inspect_recycling_video.py
```

The bundle retains the source generator, runtime preload, invocation settings, full-catalog build and test output, lint summary, preview audit, local page check, live baseline, package build and boundary audit, source frames, decoded video review sheet, and MP4.

## License and scope

All models are original kernelCAD geometry dedicated under CC0 1.0. They are visualization props. Catalog checks do not establish equipment specifications, process performance, operator safety, environmental compliance, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/recycling-facility-wave-20261103/capture_recycling_demo.py`
- video review: `python3 artifacts/catalog-demos/recycling-facility-wave-20261103/inspect_recycling_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
