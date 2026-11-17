# Five-preview ledger — 2026-11-15 (recycling-facility and mining process equipment)

Lane PR #1406 was open at round start. It had no CI run because it conflicted with `develop`. Merge commit `94b8278fb` resolved the conflict: develop had only recompressed the old renders of four previews that this branch re-rendered, so the branch renders were kept. After the merge, 2402/2402 `sourceSha256` values in `catalog/index.json` match their sources.

No ledger markdown or test under `tests/` audits the five assets below. `friction-washer` and `plastic-flake-dryer` are named only in the 2026-11-11 battery-quarantine ledger, which excluded them because a #1258 round had just rebuilt them; #1258 is merged. Open PRs (#1407, #1406, #1405, #1404, #1403, #1401, #1400, #1309, #1253, #1195, #1187, #1094) and open issues (#1416, #1402, #1388, #1321, #1295, #1272, #1271, #1259, #1227, #1152) do not touch them. Selection followed the previous ledger's pattern note: search for fixed fluid-colour constants (`water`, `slurry`) used in industrial models.

All five checked-in default previews were opened (`samples/`, `previews/before/friction-washer.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `recycling-facility/friction-washer` | 1,990 / 3,000 | `91e3e073134e753471707d406f54223dfc5bd1bde2d14d5ded1cd74c16ddf711` | `46065401572d1e09cb84180cab9e6f3a3c2c9604d8ed3c9e3dfa2c8e63e6ac53` | **Material defect, corrected.** `spray-header` is an r 32 mm pipe that runs the length of the tube top. It used the fixed `water` constant (`#5b8fb0`), so the preview showed a blue pipe on a stainless washer, and no preset could change it. The parts that `water` correctly describes are the `spray-drop-*` water columns that fall into the open tube. |
| `recycling-facility/film-wringer` | 2,536 / 3,000 | `4d5d659f97f7e6d17d44ca18784ff888e636bad5a3ec21e7c848ae5526930e46` | `ee9b64e8289a9050132f267cf75312a8f14cf88780250804e101442b7018972d` | No material defect. `water` (`#7fb0d0`) is used only on `water-stream-*` and `hopper-drip`, which are fluid. Steel hopper, barrel and screen; painted drive; orange heater bands on the barrel; grey film. |
| `recycling-facility/glass-dryer` | 1,858 / 3,000 | `727185f03ed9e75a0e47a540446e0336762de2fd054c5a3abc65bb258d762ac3` | `97b9de7f94b96d35e3088aa4afccbb64dc46303a980439b8cfa28e8ff913e3b8` | No clear material defect. Heat-resistant painted drum, steel riding rings and rollers, red burner, painted hoods and stack, green cullet. The `gas-train` and `gas-riser` use fixed yellow (`#e8c33a`), which matches common fuel-gas pipe colour coding. |
| `recycling-facility/plastic-flake-dryer` | 2,306 / 3,200 | `0d1b06e5a2aaf85d2bfe20ebbe43ec92f79d7a4c718c4488515d0dd2d6a8a78b` | `b35a396240da89b0984696be72ba43fa408d6cbf45c5fd29a7c56faf7b5df354` | No material defect. Stainless dryer housing, duct and cyclone; painted frames and motors; grey screen basket; woven big bag on a timber pallet. |
| `mining/vacuum-disc-filter` | 5,180 / 7,000 | `973c7daf3680918723bd88971584cd100ceec9b46a658abd643772509d088980` | `ebae1e89799f879eb64c50948f77ff567cd4baaddeb9bd2541b062ff2de40dbd` | No material defect. The fixed `slurry` constant (`#5a5148`) is used only on the `slurry` fill in the trough. Painted trough and frame, cloth-covered discs with cake, painted drive, valve and discharge chutes. |

## Correction

Only `friction-washer` is changed. `spray-header` now uses the `tube` control (`#bfc6c8`, "Washer tube and hopper (stainless)"). The stainless washer and hopper use the same control, and a wash-line spray header is normally stainless pipe. `spray-drop-*` keep `water`. The four colour controls, their defaults and the four presets are unchanged. Geometry, part names and triangle count (1,990) are unchanged. The source comment now calls the header a stainless pipe. `scripts/checkCatalogQuality.py --kit recycling-facility`: 153/153 pass.

Regression: `tests/integration/catalog/recyclingFrictionWasherSprayHeaderMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`spray-header should be the stainless washer finish`, see `verification/test-before.txt`) and passes after the fix.

Source SHA-256 after: `e64bf4a5dd68ab092fd85ceea48dfc50779c0ac741c2a211eb73bd4ca13626e4`. Preview SHA-256 after: `49752914772f524d4f29ea300a23b1ec7cde134ad34e921e69859ecb32907ff9`.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/friction-washer.png`. 1,265 pixels differ (difference > 8 on any channel), all inside the header pipe region (bounding box x 219-376, y 119-235). Enlarged crops: `previews/{before,after}/spray-header-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/recycling-facility/friction-washer.kcad.ts <out>`: `previews/{before,after}/inspect-iso.png`.
- Review MP4 (21 s): `recycling-friction-washer-spray-header-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after crop at 15.5 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- The `meta` description of `friction-washer` still says "spray-water header with drop nozzles". The drops are modelled as water, not nozzles. A later round can either add nozzle stubs or change the wording.
- Across all kits, only four sources define a fixed fluid-colour constant (`const water|slurry|oil|steam|gas|coolant = '#…'`): `mining/hydrocyclone-cluster`, `mining/vacuum-disc-filter`, `recycling-facility/film-wringer` and `recycling-facility/friction-washer`. After this fix, each of them applies it only to fluid parts.
