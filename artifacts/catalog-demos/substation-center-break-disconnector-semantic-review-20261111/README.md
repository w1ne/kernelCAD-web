# Center-break disconnector semantic review

**Date:** 2026-11-11
**Asset:** `grid-substation/substation-center-break-disconnector`
**Change:** Replace the suspended single bar with paired aluminum arms on porcelain post insulators, copper contact inserts and an editable open/closed blade-position choice.

## Five-preview audit ledger

| Asset | Rendered preview review |
|---|---|
| `substation-main-power-transformer` | Tank, three large bushings, auxiliary bushings, radiators, conservator and rail base read as a power transformer. |
| `substation-live-tank-breaker` | Three interrupter/bushing columns, shared frame and operating cabinet read as a live-tank breaker. |
| `substation-center-break-disconnector` | Before: one copper-colored bar floated above each pair of fixed insulators, with no attached switch arms or center break. After: six aluminum arms sit on the porcelain posts and swing apart in the default open state. |
| `substation-station-post-insulator` | Porcelain sheds and top/bottom fittings read as a station post insulator. |
| `substation-surge-arrester` | Stacked arrester modules and terminal read as a compact surge arrester; lower detail remains schematic. |

Exact open-issue and open-PR searches for the five asset IDs found no matches. The branch's open PR #1258 did not name these five IDs in its scope.

## Source and rendered evidence

The model remains a generic native KernelCAD visualization. The open/closed choice changes blade geometry only; it is not a kinematic, electrical, vendor-product or hardware-acceptance claim.

| Before | After, default open |
|---|---|
| [Before preview](previews/before.png) | [After preview](previews/after.png) |

The [source snapshots](source/) preserve the branch source before and after. The [15-second MP4](demo.mp4) shows the old preview, the repaired open state and the closed state. The [capture script](build-demo.sh), [closed-state render script](render-closed-variant.ts) and [settings](demo-settings.json) retain the exact workflow.

`kernelcad render inspect` was attempted against the existing Chrome CDP endpoint, with a 120-second command cap and 25-second per-screenshot timeout. Chrome connected but did not finish CDP attachment within its 30-second internal timeout. The failed attempt is recorded in `verification/render-inspect.log`; no second browser was launched. I inspected the rendered catalog preview and demo frames directly.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts substation-center-break-disconnector
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/grid-substation/ tests/integration/catalog/substationCenterBreakDisconnectorFidelity.test.ts
npx vitest run tests/integration/catalog/substationCenterBreakDisconnectorFidelity.test.ts
python3 scripts/checkCatalogQuality.py --kit grid-substation
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-center-break-disconnector-pages
npx tsx artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/render-closed-variant.ts
bash artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/build-demo.sh
```

The regression test exports both states, checks all six named arms and contact inserts, verifies the default open contact separation and closed contact meeting, and checks material assignments and triangle budget.

The local kit quality scan reports 80/80 passing (100%). The focused integration test and grid-substation ESLint pass. The generated index row matches the source SHA-256 and carries the rendered preview path. The local catalog page build wrote all 2,402 asset pages; this asset's page exposes `switchState`, the aluminum material knob and both presets, and its copied preview matches the rendered catalog preview. Test output, index row, local page build and demo inspection evidence are retained in `verification/`.

## Deployment boundary

This branch is not deployed. The public `/assets.json` still lists the old asset preview, and the current `/catalog/grid-substation/substation-center-break-disconnector` URL returns HTTP 404. No deployed-page behavior was verified or claimed. The MP4 shows local software renders, not electrical simulation or physical acceptance.
