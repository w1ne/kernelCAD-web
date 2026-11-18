# Amusement park quality promotion

[Watch the source-to-preview walkthrough](amusement-park-quality-promotion.mp4).

This round promotes all 70 existing `amusement-park` sources. It adds no IDs,
kits or duplicates. Each model now has three or four material-named color
controls and `festival` / `twilight` presets. High-visibility silhouettes gain
a continuous observation-wheel rim with tapered gondolas, a shaped bumper-car
deck and fairing, faceted ride-boat hulls, and a framed, glazed popcorn case
with kernels under a striped canopy. Other assets retain their purpose-built
multi-part forms and gain component-aware materials.

## Review and results

The [promotion audit](promotion-audit.json) records the existing IDs, material
controls, presets, triangle range, rendered previews and current source hashes.
The final count is 212 material controls across the 70 assets and 140 preset
variants. All previews remain below the 1,800-triangle ceiling. The
[preview review](preview-review.md) describes three opened final renders.

The MP4 compares original and promoted previews, shows native source controls,
then presents attraction and guest-precinct assets and local verification. It
demonstrates local software rendering and catalog checks. This feature branch
is not deployed, and no ride safety, operational suitability, or hardware
acceptance is claimed.

## Rebuild and verify

Run from the repository root. The [settings](settings.json), baseline previews,
storyboard frames, decoded review frames, contact sheet, and verification
outputs retain the source, invocation and evidence.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/promote_amusement_park_quality.py
mapfile -t asset_ids < <(find catalog/kits/amusement-park -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit amusement-park
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/kits/amusement-park/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs npx vitest run tests/integration/catalog/
PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-amusement-park-quality-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/verify_amusement_park_pages.py /tmp/kernelcad-amusement-park-quality-promotion-20261104
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/record_amusement_park_promotion.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/capture_amusement_park_quality_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/inspect_amusement_park_video.py
```

`catalog/index.json` is generated and must be rebuilt after the source and
preview changes. The local page check is evidence for generated branch pages;
only a later deployment and public URL check can establish published behavior.
These assets remain generic amusement-park visualization props and carry no
ride design or operational claims.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/capture_amusement_park_quality_demo.py`
- video review: `python3 artifacts/catalog-demos/amusement-park-quality-promotion-20261104/inspect_amusement_park_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
