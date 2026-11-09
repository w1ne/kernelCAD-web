# Hydroponics detail refinement — 2026-11-09

[Watch the 24-second local catalog workflow demo](hydroponics-detail-refinement.mp4).

The MP4 compares the previous and revised previews for two existing assets,
then shows real indexed variants: the tunnel's `highVisibility` preset with
closed side curtains, and the transmitter's `weathered` preset with a blind
display. The renders come from the catalog sources and values in
`catalog/index.json`; the video demonstrates source-derived previews, not a
browser interaction or a deployment.

## Result

- Refined **2 existing IDs** in place and added **0 IDs**.
- `greenhouse-tunnel-bay` now has four material color controls, four named
  looks, and a rolled-up/closed side-curtain choice. The silhouette includes
  round-top hoops, ridge purlin, film, timber hip boards, framed end walls,
  hinged door and raised crop beds.
- `wall-mounted-co2-sensor` now has four material color controls, four named
  looks, and an LCD/blind display choice. The silhouette includes the wall
  plate, rounded housing, visible 800 ppm LCD, status LED, calibration buttons,
  vent grille, cable gland and conduit.
- Re-rendered **52/52 hydroponics previews** and rebuilt the full catalog index.
- Current catalog quality audit: **2,402/2,402 assets pass (100%)**; the
  hydroponics kit gate passes **52/52**.
- Kit ESLint and catalog integration checks pass. The [page check](catalog-pages-check.json)
  verifies the locally generated kit pages and indexed variants.

The [preview review](preview-review.md) records the three rendered assets
opened for visual review. `promotion-audit.json` records source-hash and
preview-path coverage, color-control/preset counts, and triangle budgets.

## Source and invocation

The edited design sources remain in the catalog:

- [greenhouse-tunnel-bay](../../../catalog/kits/hydroponics/greenhouse-tunnel-bay.kcad.ts)
- [wall-mounted-co2-sensor](../../../catalog/kits/hydroponics/wall-mounted-co2-sensor.kcad.ts)

`settings.json` records the exact source, preview, index, quality, lint, test,
variant-render and video commands. `preview-asset-ids.txt` contains the 52
existing kit IDs passed to the renderer. `catalog-eslint-output.txt`, the
final 15/15 `catalog-test-output.txt`, the quality/render output files and JSON
audit files retain the local verification evidence. The first test attempt
reached the old 600-second catalog-index timeout; its output is preserved in
`catalog-test-600s-timeout-output.txt`. The test timeout was raised to 900
seconds after measuring the full 2,402-asset rebuild; no assertions changed.
The old renders used for the MP4's before panels are stored under `before/`
from the starting commit.

To replay preview, index and local-page generation from the completed sources:

```sh
xargs -a artifacts/catalog-demos/hydroponics-detail-refinement-20261109/preview-asset-ids.txt npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-hydroponics-detail-refinement-20261109
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-detail-refinement-20261109/verify_hydroponics_pages.py /tmp/kernelcad-hydroponics-detail-refinement-20261109
npx tsx artifacts/catalog-demos/hydroponics-detail-refinement-20261109/render_hydroponics_variants.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-detail-refinement-20261109/capture_hydroponics_demo.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-detail-refinement-20261109/inspect_hydroponics_demo.py
```

## Website and claim boundaries

On 2026-11-09, the public `/assets.json` and `/gallery.json` returned HTTP 200;
`/catalog/` returned HTTP 404. This feature branch is not deployed, so the live
asset rail does not show this round's source changes. Local static-page checks
are recorded separately from deployed behavior. The assets are visualization
props: they do not establish greenhouse suitability, crop yield, transmitter
accuracy, calibration, equipment ratings, physical fit, fabrication or
hardware acceptance.
