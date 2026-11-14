# Five-preview ledger — 2026-11-14 (farm-machinery)

PR #1258 was open at baseline head `3aee33361`. At baseline, 13 of 16 reported checks had passed and `build-and-checks`, `catalog-index` and `test-shard (3)` were still running; none had failed. The five assets below are not named in any earlier ledger under `artifacts/catalog-demos/` or report under `docs/quality/` beyond the kit-wide wave and promotion lists. Open-issue search for each id returned no results. Open-PR search returned only #1258 (for `grain-cart`, via the kit index). Merged PRs #1298, #1305, #1307 and #1308 touch other assets.

All five checked-in default previews were opened (`samples/`, `previews/before/grain-cart.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `farm-machinery/grain-cart` | 296 / 2,200 | `9ca2f5a9c84e5fdc388d876467553cd5b103bcc989c0788dbe062554343bf662` | `c9269fd7b884aac81c3dbf755821535f390fbb21da3441adf9a0601e1c3c251e` | **Material defect, corrected.** `auger-base` and `auger-tube` form the unloading auger. They used `steelColor` ("Exposed steel"), the finish of the wheel hubs, so the auger rendered as a bare grey post above the hopper. A grain-cart unloading auger is a painted steel tube, finished in the same paint as the hopper. **Geometry defects, recorded and not corrected:** both wheels are at `x = -65`, inside the body, so no wheel is visible; the auger is a vertical post with a short stub, not a folding side-mounted auger. The inspector reports `mechanism.interpenetration` (badge present before and after). |
| `farm-machinery/bale-wrapper` | 136 / 2,200 | `6584905bac64a2ae9d8db296ff693459825d61d8de1a613217f1c4e541a8c07e` | `9bccf4d7968dbd4618a2a4ea0e0a5bed0a6a55a1c44c496b484e6c1371bfb346` | **Geometry defect, recorded and not corrected.** The two cradle rollers stand vertical (should lie horizontal under the bale); there is no bale, no turntable and no support wheels, although the description lists wheels. The part named `hay-frame` is the main frame. Materials (painted frame, exposed-steel rollers, polymer film roll) are coherent. |
| `farm-machinery/manure-spreader` | 444 / 2,200 | `dd87965198045ed621d737f6a8e75b4cdecb90c10300965b0ff3504751e3e6b7` | `599212010c2a6e2f03031fd18d042843ce96219512632cfba5e7588ec618907a` | Reads as a box on a frame with vertical beaters. **Geometry defect, recorded:** both wheels are at `x = -217`, one side only; the hubs are not rotated with the tyres. Vertical steel beaters are correct for many spreaders. Materials coherent. |
| `farm-machinery/cotton-picker` | 544 / 2,200 | `dacccdd45ad0b08002a7294243a744a38296f870df870d54cbee69d5ca09a4f8` | `7b6f56092fc06323ef072ea1eacf0a2093d74d682280b7fdf1a7f4356389cab3` | Does not read as a cotton picker: the four picking units are on the roof, the cab has no glazing, the basket is not visible and the chassis floats below the body. Exposed-steel unloading auger is the same pattern as on `grain-cart`, but production cotton pickers have no grain unloading auger; that is a geometry/label issue, not a single material fix. Recorded, not corrected. |
| `farm-machinery/forage-harvester` | 472 / 2,200 | `b8fc01e59a89d06cbf5658eb14284b0ee7f1982fd66df06211ca3cd907d2a12d` | `0d12b23de57edc90313b51b19406caca9fd0d59d0f5875d8e1aef02cda4c4cb8` | Same combine template as `cotton-picker`. A self-propelled forage harvester has a crop spout, not a grain tank and unloading auger; the asset has both (`grain-body`, `unloading-auger`). Cab has no glazing. Recorded, not corrected; needs a geometry round. |

## Correction

Only `grain-cart` is changed. `auger-base` and `auger-tube` now use `paintedSteelColor`, the "Painted steel" control already used by the hopper sides, cover, chassis and drawbar. Geometry, part names, triangle count (296), the three colour controls and the two presets are unchanged. Wheel hubs keep `steelColor`.

Regression: `tests/integration/catalog/grainCartAugerMaterial.test.ts` reads the palette zones and the exported GLB colours. It fails on the baseline source (`expected [ Array(8) ] to include 'auger-base'`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/grain-cart.png`. 951 pixels differ (difference > 8 on any channel), all inside the auger post (bounding box x 269-281, y 51-192). Enlarged crops: `previews/{before,after}/grain-cart-auger-crop.png`.
- Focused views from `npx kernelcad render inspect catalog/kits/farm-machinery/grain-cart.kcad.ts <out> --focus auger-base,auger-tube,grain-cover,wagon-side-1`: `previews/{before,after}/inspect-auger-{front,iso}.png`.
- Review MP4 (21 s): `farm-machinery-grain-cart-auger-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after default preview at 19 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- One-sided or hidden wheel sets recur in this kit (`grain-cart`, `manure-spreader`), as on `railway/hopper-wagon`. A kit-wide check of wheel `x` positions is a cheap next audit.
- `cotton-picker` and `forage-harvester` share a combine template with a grain tank and unloading auger; both need their own silhouettes.
