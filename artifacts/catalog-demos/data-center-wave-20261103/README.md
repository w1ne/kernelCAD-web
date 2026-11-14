# Data-center infrastructure catalog wave

[Watch the 30-second local workflow demo](data-center-infrastructure.mp4).

The video shows an editable rack source and its rendered mesh, contact sheets for all 50 assets, and the local catalog audit. The final frame separates the current live-site snapshot from this unmerged, undeployed branch. These are generic scene props and make no capacity, reliability, facility-design, electrical, cooling, safety, or physical-acceptance claim.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/data-center-wave-20261103/generate_data_center_assets.py
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/data-center-wave-20261103/check_live_site.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-data-center-pages
python3 artifacts/catalog-demos/data-center-wave-20261103/verify_data_center_pages.py /tmp/kernelcad-data-center-pages
npm pack --dry-run --json
mkdir -p /tmp/kernelcad-data-center-npm-pack
npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-data-center-npm-pack
python3 artifacts/catalog-demos/data-center-wave-20261103/audit_npm_pack.py /tmp/kernelcad-data-center-npm-pack/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/data-center-wave-20261103/write_data_center_readme.py
python3 artifacts/catalog-demos/data-center-wave-20261103/record_data_center_checks.py
python3 artifacts/catalog-demos/data-center-wave-20261103/capture_data_center_demo.py
python3 artifacts/catalog-demos/data-center-wave-20261103/inspect_data_center_video.py
```

The generator retains every asset specification and writes `settings.json`. Build, lint, test, page, website, and package evidence are retained beside this README. `video-review/` contains the decoded samples, contact sheet, and video metadata. The video source and capture settings are retained here.

## Package boundary

The prepack build creates the CLI and generic headless player before the npm artifact is packed. The audited tarball should contain the generated catalog and these 50 model sources and previews, while keeping the export map limited to `./package.json` and excluding hosted product paths. The audit script records the tarball hash, included asset counts, and package path check.

## Scope and deployment

All models are original CC0 1.0 kernelCAD geometry. Local source, index, mesh, preview, page, integration, and package checks do not prove deployed behavior. The current public site snapshot is not this branch; deployed asset-rail behavior remains to be checked after deployment.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/data-center-wave-20261103/capture_data_center_demo.py`
- video review: `python3 artifacts/catalog-demos/data-center-wave-20261103/inspect_data_center_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
