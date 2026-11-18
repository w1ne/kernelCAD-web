# Data-center day fuel tank support-skid material review

Date: 2026-11-16
Asset: `data-center-infrastructure/day-fuel-tank`
Change: the tank support skid moves from the `polymer` ("Engineering polymer") control to a new `skidSteel` ("Skid base steel") control. The reservoir, fill neck, level gauge, platform and drain valve keep painted steel.

## Review ledger

| Rendered preview | Result |
| --- | --- |
| `data-center-infrastructure/day-fuel-tank` | Found the steel support skid rendered as yellow engineering polymer; corrected (follow-up from 2026-11-15). |
| `data-center-infrastructure/liquid-cooling-manifold` | Left support base is polymer, mirrored right base is steel; not fixed this round (follow-up). |
| `data-center-infrastructure/overhead-coolant-header` | Left hanger is polymer, mirrored right hanger is steel; not fixed this round (follow-up). |
| `data-center-infrastructure/in-row-cooler` | Base plinth uses polymer; small visible band; lower-priority follow-up. |
| `data-center-infrastructure/data-center-plate-heat-exchanger` | Rear outlet flange uses polymer but is hidden in the preview; source-only follow-up. |

See [`preview-review.md`](preview-review.md) and [`preview-review-five-assets.png`](preview-review-five-assets.png) for the visual ledger and contact sheet. Baseline captures are under [`samples/`](samples/). Before/after images, skid detail crops, and source snapshots are under [`previews/`](previews/) and [`sources/`](sources/).

## Demo

[Watch the MP4 workflow and result](data-center-day-fuel-tank-skid-material-review.mp4). Source invocation and settings are in [`make_demo.sh`](make_demo.sh) and [`demo-settings.json`](demo-settings.json). Frame inspection evidence and `ffprobe` metadata are in [`video-review/`](video-review/).

The clip shows a local software preview and a source-level regression result. It does not show deployed behavior, physical equipment, or hardware acceptance.

## Verification

- Regression: `npx vitest run tests/integration/catalog/dataCenterDayFuelTankMaterials.test.ts` — passed (1 test). The pre-fix failure is in [`verification/test-before.txt`](verification/test-before.txt).
- Full catalog integration suite: `npx vitest run tests/integration/catalog/` — passed, 105 files and 173 tests ([`verification/vitest-catalog.txt`](verification/vitest-catalog.txt)). The freshness test rebuilt every catalog source and confirmed the committed index.
- Lint: `npx eslint catalog/kits/data-center-infrastructure/ tests/integration/catalog/dataCenterDayFuelTankMaterials.test.ts` — passed.
- Quality gate: `python3 scripts/checkCatalogQuality.py --kit data-center-infrastructure` — 50/50 pass.
- Preview: `npx tsx scripts/renderCatalogPreviews.ts day-fuel-tank` — rendered at 200 triangles, within the 2,200 budget.
- Index: `npx tsx scripts/buildAssetCatalog.ts` — regenerated row in [`verification/index-row-after.json`](verification/index-row-after.json).

## Comparison notes

The engineering basis is general: packaged generator day tanks are supplied on welded structural steel skids or stands. Public artifacts describe the generic kernelCAD model and make no vendor-specific fidelity claim.

This branch has not been deployed. No post-deployment verification is claimed.
