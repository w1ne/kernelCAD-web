# Mining catalog wave demo

[Watch the 30-second local workflow demo](mining-kit.mp4).

The video shows the generated jaw-crusher source and its mesh preview, then contact sheets covering all 50 assets. The final frame reports the source/index/mesh audit, preview coverage, lint, integration suite, and locally generated asset pages. It distinguishes the current live site snapshot from this unmerged, undeployed branch. The demo makes no operating-performance or hardware-acceptance claim.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/mining-wave-20261103/generate_mining_assets.py
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/mining-wave-20261103/check_live_site.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-mining-pages
python3 artifacts/catalog-demos/mining-wave-20261103/verify_mining_pages.py /tmp/kernelcad-mining-pages
npm pack --dry-run --json
npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-mining-npm-pack > artifacts/catalog-demos/mining-wave-20261103/npm-pack-built-artifact.json
python3 artifacts/catalog-demos/mining-wave-20261103/audit_npm_pack.py /tmp/kernelcad-mining-npm-pack/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/mining-wave-20261103/write_mining_readme.py
python3 artifacts/catalog-demos/mining-wave-20261103/record_mining_checks.py
python3 artifacts/catalog-demos/mining-wave-20261103/capture_mining_demo.py
python3 artifacts/catalog-demos/mining-wave-20261103/inspect_mining_video.py
```

The generator retains every asset specification and writes `settings.json`. Build, lint, test, page, website, and package outputs are retained beside this README. `video-review/` contains decoded frames, a contact sheet, and MP4 metadata; the source and command used to create the video are retained here.

## Package boundary

The package build and packed tarball were audited after the catalog suite. The tarball contains the CLI, headless player, catalog index, and all 50 mining sources and preview PNGs. Its package export map remains limited to `./package.json`, and the packed file list contains no hosted product UI or commercial orchestration paths. The initial build exposed a TypeScript-only listener signature mismatch in the existing OCCT reset helper; its listener alias now accepts `unknown[]`, with no runtime change. The first error is retained in `npm-pack-initial-build-error.txt`. `npm-pack-contents-check.json` records the tarball hash and file counts; the 49 MB temporary tarball was inspected from `/tmp` and is not included in this repository bundle.

## Scope and verification limits

All assets are original CC0 1.0 kernelCAD geometry. They are stylized scene props and do not claim throughput, process performance, structural suitability, safety certification, installation suitability, or physical acceptance. Static pages and previews were checked locally. The public homepage snapshot records what was live during this round; this branch was not deployed, so the new kit's deployed behavior is unverified.
