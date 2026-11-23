# Five-preview ledger — 2026-11-14 (postal-logistics)

PR #1258 was merged into `develop` at baseline. One later lane commit (`4884e96c3`, grain-cart auger) was on `feat/catalog-2000` without an open PR. The five assets below are not named in any earlier ledger under `artifacts/catalog-demos/*review*`. Open-issue search for the five ids returned no results. No open PR touches the `postal-logistics` kit. Merged PRs #1298, #1305, #1307 and #1308 touch other assets.

All five checked-in default previews were opened (`samples/`, `previews/before/sliding-shoe-sorter-section.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `postal-logistics/sliding-shoe-sorter-section` | 780 / 1,800 | `83b2475d4aae0e8d6ea4eddf40e6dc926d88423235aa76f02bf216ae321f0f5e` | `44dcadcaf50d4cecb64896c907b5ec31e40fff286b96358f6b907cfface19ede` | **Material defect, corrected.** `shoe-rail` is the 1,140 mm guide track of the sorter. It used `safetyAmber` ("Safety amber"), the hazard-marking control of the diverter shoes, so rail and shoes rendered as one amber bar and the rail changed with every marking colour. A sorter guide track is bare steel, like the side guides. **Geometry defects, recorded and not corrected:** the shoes stand 50 mm above the deck at `z = 820` on a deck top of `z = 770`; no slats are modelled; the inspector reports `mechanism.interpenetration` (badge present before and after). |
| `postal-logistics/parcel-singulator` | 720 / 1,800 | `82353c969625d84dbdc35eb5dc440d81a2a24a7f16c6d928bea79ed29fe9112d` | `210b4b1753e2cc518e8975f5e11571a7b673df28ec84fc88d2804b0b3df0145f` | Materials coherent: painted deck and separator bars, stainless side guides, structural stands, amber infeed stop. **Geometry defect, recorded:** a single belt deck with fixed cross bars; a real singulator has staggered angled belt zones or rollers. Only two stand legs. |
| `postal-logistics/powered-sack-dumper` | 720 / 1,800 | `85a7858a20436f7a2e5ebe282b1184993bb148c9d2ea973d51a45f7dd1355208` | `3f7bcd4e0bcf0f3e6a800623c0cdcac89ce686f1d175b892b667238e53e4d00a` | Materials plausible: stainless lift actuators and control head occur on food-grade tip stations. **Geometry defect, recorded:** the cradle is level and reads as a chair; there is no pivot and no tilt. |
| `postal-logistics/mailbag-closing-machine` | 660 / 1,800 | `fd77aefa3a73571c8561cb8a05b078c4cde52f3b78fc44530128de0af76a6aa2` | `627475a6225d21908229c8322614cddf016b909490b30222a98bc14445e1b33b` | `bag-guide` uses the `fabric` ("Woven fabric") control. The part reads as the sack in the guide, and `fabric` is the only control for it, so this is a label ambiguity, not a clear material defect. Not changed. **Geometry defect, recorded:** the closing head is a plain box with no sewing throat. |
| `postal-logistics/spiral-parcel-chute` | 660 / 1,800 | `5b014b22d2715095f72cf212ac807b823bb8319d6644dfccff14399e62ed9322` | `5c653ecfd75f413c2c62534871ae7140808eea1efc574d88e503edc86ddbf283` | Materials coherent. **Geometry defect, recorded:** four flat, level shelves around a mast; the chute has no continuous helical slide and no slope, so parcels cannot slide. Needs a geometry round. |

## Correction

Only `sliding-shoe-sorter-section` is changed. `shoe-rail` now uses `stainlessSteel`, the "Stainless steel" control already used by `left-guide` and `right-guide`. Geometry, part names, triangle count (780), the four colour controls and the two presets are unchanged. The diverter shoes keep `safetyAmber`.

Regression: `tests/integration/catalog/slidingShoeSorterRailMaterial.test.ts` reads the palette zones and the exported GLB colours. It fails on the baseline source (`expected [ 'left-guide', 'right-guide' ] to include 'shoe-rail'`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/sliding-shoe-sorter-section.png`. 3,415 pixels differ (difference > 8 on any channel), all inside the rail and shoe area (bounding box x 152-360, y 74-190). Enlarged crops: `previews/{before,after}/shoe-rail-crop.png`.
- Focused views from `npx kernelcad render inspect catalog/kits/postal-logistics/sliding-shoe-sorter-section.kcad.ts <out> --focus shoe-rail,shoe-a,shoe-b,shoe-c,shoe-d,sorter-bed,left-guide,right-guide`: `previews/{before,after}/inspect-rail-{iso,top}.png`.
- Review MP4 (21 s): `postal-sliding-shoe-sorter-rail-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after default preview at 19 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- The `postal-logistics` kit uses one bevelled-box template for every asset. Material assignments are mostly coherent; the larger defects are geometric (level spiral chute, untilted dumper, floating sorter shoes).
