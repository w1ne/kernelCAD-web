# Grid substation quality promotion

[Watch the 21-second source-to-preview walkthrough](grid-substation-quality-promotion.mp4).

This round promotes the existing 80 `grid-substation` assets. It adds no IDs,
kits or duplicates. Every source has two to four material-named color controls,
`weathered` and `maintenance` presets, component-aware geometry and a refreshed
preview. The default triangle budget remains 1,800; rendered meshes range from
64 to 1,648 triangles.

## Results and review

The [promotion audit](promotion-audit.json) records 239 material controls
(159 more than the former one-per-asset knob) across 16 named roles and 160
finish variants (80 each of `weathered` and `maintenance`). No source IDs were
added or removed. The full [preview render
log](catalog-preview-render-output.txt) covers all 2,390 catalog assets; the
[index build](catalog-index-build-status.json) and [preview audit](catalog-preview-render-status.json)
record the regenerated 2,390-row index and its successful full preview run.
All 80 grid-substation rows have current source hashes and preview paths.

The first detailed turret shed pass measured 3,948 triangles and exceeded the
1,800 budget. The final four-profile beveled sheds retain the ribbed insulator
cores and bring the turret to 1,608 triangles; the
[budget refinement note](turret-budget-refinement.md) records the change.
The [preview review](preview-review.md) records five opened final renders.

The catalog quality gate passed 80/80, kit ESLint passed, and the [catalog
integration suite](catalog-test-output.txt) passed 4 files / 15 tests. The
[local page audit](catalog-pages-check.json) passed for 80 page/preview pairs;
the complete local build generated 2,390 pages and the hub.

The demo shows original and promoted previews, native source controls and
presets, representative switching / transformer / cable assets, and local
validation. Its MP4 source, settings, baseline preview images, storyboard
frames, decoded review frames, contact sheet and inspection record are retained
in this bundle.

The PR is merged, but the public asset URL returned HTTP 404 at the
2026-11-04 check; see [live-site evidence](live-website-check.json). Local page
generation does not verify a public page. Check the published catalog after
deployment. These assets are visualization props. The render and catalog
checks do not establish equipment ratings, electrical safety, grid compliance,
operating procedures, field acceptance or hardware behavior.

## Rebuild and verify

Run from the repository root. `catalog/index.json` is generated and must be
rebuilt after source and preview changes. The retained [settings](settings.json)
records the commands and Node compatibility setup.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-wave-20261103/generate_grid_substation_assets.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-quality-promotion-20261104/promote_grid_substation_quality.py --apply
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/renderCatalogPreviews.ts
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit grid-substation
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/kits/grid-substation/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs npx vitest run tests/integration/catalog/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-grid-substation-quality-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-quality-promotion-20261104/verify_grid_substation_pages.py /tmp/kernelcad-grid-substation-quality-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-quality-promotion-20261104/record_promotion_results.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-quality-promotion-20261104/capture_grid_substation_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-quality-promotion-20261104/inspect_grid_substation_video.py
```
