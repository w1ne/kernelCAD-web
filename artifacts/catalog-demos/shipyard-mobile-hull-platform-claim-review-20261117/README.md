# Shipyard mobile hull platform description correction — 2026-11-17

## Finding

The published detail page claimed the four support posts were adjustable in
height. The source has four fixed 560 mm post solids, an overall scale control,
and three material controls; it has no post-height parameter or adjustment
mechanism. The description now says “fixed-height support posts.” Geometry,
colors, presets, and parameter controls are unchanged.

The five previews showed no clear color/material-role mismatch. This round's
correction addresses the false adjustment claim in the selected asset metadata.

## Five-preview audit

The sample was selected after checking all currently open pull requests and
issues. None of these five assets is named by an open target. The current
industrial-plant PR #1507 and the older catalog PR #1258 were checked before
selection; #1258 is merged with green CI and no submitted reviews. The full
visual notes and source/preview hashes are in [preview-review.md](preview-review.md).

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts mobile-hull-access-platform
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/shipyard/ tests/integration/catalog/mobileHullAccessPlatformDescription.test.ts
npx vitest run tests/integration/catalog/mobileHullAccessPlatformDescription.test.ts
npx tsx artifacts/catalog-demos/shipyard-mobile-hull-platform-claim-review-20261117/verification/check_local_page.ts
bash artifacts/catalog-demos/shipyard-mobile-hull-platform-claim-review-20261117/make_demo.sh
```

The local check runs the catalog page renderer for
`shipyard/mobile-hull-access-platform`. Commands and capture settings are in
[demo-settings.json](demo-settings.json). The [12-second local demo](shipyard-mobile-hull-platform-claim-review.mp4)
is included in this bundle.

## Evidence boundary

The local before/after previews are expected to be pixel-identical because the
correction changes metadata only. The demo shows the source description,
software-rendered preview, regenerated index, and local checks. This branch is
not deployed. The public page was HTTP 200 before the change; updated public
page verification remains pending deployment. The work is a catalog
visualization and metadata correction, not a safety rating, simulation, or
hardware acceptance result.
