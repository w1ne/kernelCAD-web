# Recycling facility quality promotion

[Watch the 24-second source-to-preview walkthrough](recycling-facility-quality-promotion.mp4).

This round improves the existing 153 recycling-facility assets. It does not add,
rename, or duplicate catalog entries. The source promotion separates colors by
named material and component, adds `weathered` and `highVisibility` variants,
and refines process cylinders with ruled faceted profiles. The digester has a
visible front ladder and rungs so its preview reads as process equipment. Box
forms remain where a rectilinear silhouette suits the object.

## Results

See [promotion-audit.json](promotion-audit.json), [catalog-eslint-status.json](catalog-eslint-status.json),
[catalog-test-status.json](catalog-test-status.json), and [catalog-pages-check.json](catalog-pages-check.json)
for the recorded source, preview, lint, integration, and local page checks. The
[preview review](preview-review.md) records three opened final renders.

The MP4 shows the retained single-color previews beside the refreshed material
previews, an actual `.kcad.ts` source with its material controls and presets, and
representative assets from each kit section. Its final frame reports local
catalog checks. This demonstrates source authoring, rendering, indexing and
local validation only. The assets are visualization props; this does not assess
equipment ratings, plant process behavior, operator safety, environmental
compliance, hardware acceptance, or physical performance.

The live-site check returned the homepage and asset manifest, but still found
the previously published catalog: 2,100 assets, 153 recycling-facility rows,
and the sampled published sources still use a generic color knob without
presets. See [live-site evidence](live-website-check.json). This follow-up
source change is not deployed; verify the public pages after it is integrated
and a new site build is published.

## Rebuild and verify

Run from the repository root. This bundle retains the source promotion script,
Node compatibility preload, capture source, settings, before images, command
outputs, final rendered frames, decoded MP4 contact sheet, and video inspection
manifest.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/promote_recycling_facility.py
mapfile -t asset_ids < <(find catalog/kits/recycling-facility -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-promotion-20261104/node-preload.mjs --import tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-promotion-20261104/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/kits/recycling-facility/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/recycling-facility-promotion-20261104/node-preload.mjs npx vitest run tests/integration/catalog/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-promotion-20261104/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-recycling-facility-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/verify_recycling_facility_pages.py /tmp/kernelcad-recycling-facility-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/record_promotion_results.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/capture_recycling_promotion_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/inspect_promotion_video.py
```

`catalog/index.json` is generated; rebuild it after any source or preview change.
The local page audit verifies all 153 kit pages, their previews, parameter names,
and the catalog hub entry. The full indexed preview renderer was also run, so
the recorded render log covers all 2,390 catalog entries as well as this kit.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/capture_recycling_promotion_demo.py`
- video review: `python3 artifacts/catalog-demos/recycling-facility-promotion-20261104/inspect_promotion_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
