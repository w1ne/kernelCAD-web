# Marine quality promotion

[Watch the 18-second source-to-preview walkthrough](marine-quality-promotion.mp4).

This round improves the existing 40 marine assets and adds no catalog entries.
Each asset now has two to four material-named color controls and `weathered`
and `highVisibility` presets. Named parts receive finishes suited to marine
equipment, including painted hulls, timber, galvanized and stainless steel,
glass, rope, rubber, canvas, webbing, and safety materials. Existing silhouettes
and triangle budgets are retained. Across the kit, 122 material controls replace
40 generic color controls (net +82); 40 preset blocks provide 80 named variants.

## Results and evidence

- [promotion audit](promotion-audit.json) records the material assigned to each
  part, parameters, presets, and original base color for all 40 assets.
- [preview render output](catalog-preview-render-output.txt) records the 40
  regenerated PNG previews; the updated paths and source hashes are in the
  generated `catalog/index.json`.
- [quality gate](catalog-quality-output.txt) records the catalog pass rate.
- [marine-only quality gate](catalog-quality-marine-output.txt) records 40/40
  passing. The full catalog remains at 2,171/2,390 passing (219 thin assets in
  other kits), so its report exits 1 by design while the lane continues.
- [local page build](catalog-pages-build-output.txt) generated 2,390 asset pages;
  [marine page audit](catalog-pages-check.json) verifies all 40 detail-page and
  preview pairs and their indexed parameter names.
- [ESLint output](catalog-eslint-output.txt) and
  [catalog integration output](catalog-test-output.txt) record required checks.
- [preview review](preview-review.md) describes three opened final renders.
- `before/` retains the old cargo ship, anchor, and life jacket previews;
  `video-review/contact-sheet.png` contains sampled frames decoded from the MP4.

The video shows the original one-color renders beside the material-separated
results, an excerpt from the actual life-jacket source, and local verification.
This demonstrates source authoring, preview rendering, index generation, lint,
and catalog integration checks. It does not show a deployed public page or claim
hardware acceptance, seaworthiness, or physical performance.

## Rebuild and verify

Run the source-promotion script against the pre-promotion marine sources. It
refuses already-promoted input to prevent a second pass from silently changing
materials. Then run the catalog commands from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/marine-promotion-20261106/promote_marine.py
mapfile -t asset_ids < <(find catalog/kits/marine -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/marine-promotion-20261106/node-preload.mjs --import tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/marine-promotion-20261106/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit marine
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/kits/marine/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/marine-promotion-20261106/node-preload.mjs npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/marine-promotion-20261106/capture_marine_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/marine-promotion-20261106/inspect_marine_video.py
```

The source promotion and its invocation settings are retained in
`promote_marine.py` and `settings.json`. `catalog/index.json` is generated; do
not edit it by hand.
