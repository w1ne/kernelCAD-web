# Five-preview ledger — 2026-11-15 (wind-energy)

Lane PR #1406 was open at round start. All its checks passed (17 pass, 0 failing) and it was mergeable. Earlier ledgers under `artifacts/catalog-demos/` name only three `wind-energy` assets (`converter-cabinet`, `pad-mount-transformer`, `wind-turbine-blade`). No single-asset test under `tests/` names the five assets below. Open PRs (#1413, #1407, #1406, #1405, #1404, #1403, #1401, #1400, #1309, #1253, #1195, #1187, #1094) and open issues (#1412, #1259) do not touch them.

All five checked-in default previews were opened (`samples/`, `previews/before/oil-cooler-module.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `wind-energy/oil-cooler-module` | 2,968 / 4,200 | `3908a1e83112937318f9c1346045adcfe3e9bd4372e9a41b44b903b22e520647` | `e29801e732b404489fa991a85dbcb39fb57fd9c2c516560601c686381d4c1a5b` | **Material defect, corrected.** `header-top` and `header-bottom` (r 70 x 1,460 mm manifolds along the core) used `pipework` (`#9a5a32`, copper). On an aluminium bar-and-plate oil cooler the headers are the core's own welded aluminium manifolds. The source comment and description already call the core "finned aluminium". The preview showed two long copper bars framing an aluminium core. **Recorded, not changed:** the `pipework` default is copper, but `gearbox-enclosure` draws its `oil-line` in stainless steel; the `nacelleWhite` preset already uses grey steel lines. The fan guards use `aluminium`, but wire guards are usually zinc-plated steel. The inspector reports `mechanism.interpenetration` before and after (same badge). |
| `wind-energy/gearbox-enclosure` | 3,112 / 3,600 | `fd9f8f7e996458008a3e419e050d710597ea53a1708fb8e8a302fd820b4949d2` | `903e46c856bad2d0d429d4dca98b63893861acf51928e7009025250310071e43` | No material defect: cast housings and bearing caps, painted covers and caliper, steel shafts, brake disc and oil line, elastomer coupling insert. |
| `wind-energy/grounding-busbar` | 300 / 600 | `f3ec500dca0f2f2f828ccce3492f698c3e5b0cd2a781a07ecbd0d2d97492fadc` | `e0856839a003605f7fc0fd9f5cf596aa7a32869c009157414ce8429dd7280496` | Default materials are right: copper bar, ceramic standoffs, stainless studs. **Preset defect, recorded:** `highVisibility` sets `copper` to `#d8a62b` (safety yellow). Bare copper is not painted, so this preset turns the earth bar into a yellow bar. Not changed because the default preview is correct. |
| `wind-energy/cable-reel-stand` | 148 / 300 | `17a6ddda9e6f286742e98d32a8856755b304d93dc1d0df400ca67989aac03c37` | `dffd3c38eab55cc1a1932486c8f347e8a7aa42cd18cff37eaf45270d05d6cece` | **Geometry defect, recorded:** the `reel` is a flat disc on a vertical axis (`cylinder` along Z, z 290 to 470). Nothing supports it. The `axle` is a short vertical stub (z 550 to 640) under the crossbar, not a horizontal shaft between the uprights. A cable drum stand holds the drum on a horizontal spindle. Also, the reel is `structuralSteel` with no cable on it. Candidate for a geometry rebuild, not a colour change. |
| `wind-energy/blade-root-lifting-yoke` | 168 / 350 | `81632d500e849a38ef81e901a962255f816396604b2f60906c5d133e96aaefd1` | `18e231c8d5f467c7204ee01c454836e6994ccbd22dc1f3d827a51754b360e18d` | **Geometry defect, recorded:** the yoke stands on two 600 mm legs, so it reads as a gantry. A lifting yoke hangs from the hook with slings or clamps under the beam. The lugs are `stainlessSteel`; welded lifting lugs are normally the same structural steel as the beam. Not changed in this round. |

## Correction

Only `oil-cooler-module` is changed. `header-top` and `header-bottom` now use the `aluminium` control (`#aab7bb`), the core finish. `inlet-line`, `outlet-line` and `thermostatic-bypass` keep `pipework`. The flanges and end caps keep `powderCoatedSteel`. No control is added or removed: the four colour controls, their defaults and the three presets are unchanged. Geometry, part names and triangle count (2,968) are unchanged. `scripts/checkCatalogQuality.py --kit wind-energy`: 50/50 pass.

Regression: `tests/integration/catalog/windOilCoolerHeaderMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`header-top should be the aluminium core finish`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/oil-cooler-module.png`. 9,969 pixels differ (difference > 8 on any channel), all inside the header area (bounding box x 122-359, y 72-359). Enlarged crops: `previews/{before,after}/header-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/wind-energy/oil-cooler-module.kcad.ts <out>`: `previews/{before,after}/inspect-iso.png`.
- Review MP4 (21 s): `wind-oil-cooler-header-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after crop at 15.5 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- Generator-built wind-energy props (`b(...)`/`c(...)` helpers) have geometry errors that a colour pass cannot fix: `cable-reel-stand` (flat floating reel) and `blade-root-lifting-yoke` (legs on a lifting yoke).
- `grounding-busbar` `highVisibility` preset paints copper yellow; check other kits' presets for the same copper-to-yellow mapping.
