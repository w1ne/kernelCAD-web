# Five-preview ledger — 2026-11-15 (mining)

Lane PR #1406 was open at round start. All its checks passed (17 pass, 0 failing). Earlier mining reviews under `artifacts/catalog-demos/` cover `high-pressure-grinding-rolls`, `longwall-shearer`, `mine-skip`, `rock-breaker-boom` and `jaw-crusher-module`. No ledger markdown or test under `tests/` names the five assets below. Open PRs (#1407, #1406, #1405, #1404, #1403, #1401, #1400, #1309, #1253, #1195, #1187, #1094) and open issues (#1416, #1402, #1388, #1321, #1295, #1272, #1271, #1259, #1227, #1152) do not touch them.

All five checked-in default previews were opened (`samples/`, `previews/before/magnetic-separator-drum.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `mining/magnetic-separator-drum` | 1,324 / 2,800 | `dfabd08d558c7b78eaf5838e547ce50e31d508e943e4e2017340236c05ba8f5e` | `dfffd6651b28f83aa18e9da34a86392bafa814155f71832093af73be437cd7e9` | **Material defect, corrected.** `wash-header` (the r 45 mm riser that feeds the spray pipe over the drum) used a fixed `water` constant (`#7fa6b8`, light blue). That is the colour of the fluid, not of a pipe. No water is drawn anywhere else in the model. The `spray-pipe` it connects to, which is the same r 45 mm line, uses `frameSteel`. The preview showed a blue stub on a dark steel pipe. Because the colour was a fixed hex, no preset changed it, so `highVisibility` and `weathered` also kept the blue stub. |
| `mining/hydrocyclone-cluster` | 5,412 / 6,400 | `ef69fbbdd8cf9a328c5b5fc916785ea44472ba4935c59b98bb833a0b46ec1794` | `021f916b19c10d419fb9ad7d596fa1167a8f503da48b5bc9c9d24a75d12d73c1` | No clear material defect: coated cyclone bodies, rubber overflow hoses, apex spigots and feed pipe, steel platform and launders. **Recorded, not changed:** the knife-gate bodies use `stainlessSteel`. Slurry knife gates often have a painted cast or ductile-iron body with a stainless blade only. Both are used in practice, so this is not a clear error. |
| `mining/belt-magnet-separator` | 2,060 / 2,600 | `e1b69ea3a7294ebbf0f96dace961612b1f0f5bb5ab4dfc3a79c7af07f3e3d8c4` | `83d2dd868cd8fb61b9e3f6d53221828c893e78134e793e72ed592fc528c67b63` | No clear material defect. **Recorded, not changed:** the conveyor `head-gearbox` and `head-motor` use `magnetPaint` (blue), while the magnet's own `drive-gearbox` uses `structureSteel` (gold). The two drive colours look swapped, but either scheme is plausible on site. |
| `mining/mine-sump-pump` | 1,556 / 2,000 | `3d3985ee18036448771f96bc49baa63b49549dc10750f2d8cc7963171c255210` | `dfeefe2581489c8760337eae6396242e9e9d89875195f041d0a3e2337162d737` | No material defect: painted pump, motor and valves, steel pipe and beams, concrete floor, black handwheel and cable. **Geometry note, recorded:** in the default preview the pit is hard to read from above. The water surface (z 760) sits 440 mm below the floor (z 1200), and the beams and baseplate hide most of it. |
| `mining/flotation-cell-bank` | 5,712 / 7,400 | `2eee1ed872c6d0fd7dabe94cb3d4c64a29a3b31afc43995a52c4171a305a2159` | `361ae8b93bb486832f0cbe266bfaf81ee69c4c7210b39776e1100d4406f8c9d0` | **Possible material defect, recorded, not changed:** the external froth `launder-${i}` rings use the `rubber` control, labelled "Rubber-lined launders and hoses". A rubber lining is on the inside. The outer shell of a tank-cell launder is painted steel like the tank. The control label states this choice on purpose, so a fix needs a control or label change. That is larger than one part recolour. |

## Correction

Only `magnetic-separator-drum` is changed. `wash-header` now uses the `frameSteel` control (`#4b5459`), the same as `spray-pipe`. The unused `water` constant is removed. `spray-nozzle-*` keep `drumStainless`. No control is added or removed: the four colour controls, their defaults and the three presets are unchanged. Geometry, part names and triangle count (1,324) are unchanged. `scripts/checkCatalogQuality.py --kit mining`: 50/50 pass. In `stages: double` the second unit's `wash-header-1` gets the same fix through the shared `unit()` function.

Regression: `tests/integration/catalog/miningSeparatorWashHeaderMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`wash-header-0 should be the frame steel wash-water line`, see `verification/test-before.txt`) and passes after the fix.

Source SHA-256 after: `a109d9f828cc2464ac4ff46f019d789b8a420165d01a0963c654209a6e2f1942`. Preview SHA-256 after: `7e58e433089a5f488c973e44f35a3e99901a7aa704b6b84d273f87a61c5df729`.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/magnetic-separator-drum.png`. 395 pixels differ (difference > 8 on any channel), all inside the riser (bounding box x 264-272, y 141-191). Enlarged crops: `previews/{before,after}/wash-header-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/mining/magnetic-separator-drum.kcad.ts <out>`: `previews/{before,after}/inspect-iso.png`. The inspector reports `mechanism.interpenetration` before and after (same badge, not caused by this change).
- Review MP4 (21 s): `mining-separator-wash-header-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after crop at 15.5 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- Fixed hex constants named after a fluid (`water`) used on a pipe part. Search other kits for `.color(water)` on pipe parts.
- `flotation-cell-bank` external launders in `rubber`: decide whether the control should be "launder lining" (inside only) with the outer shell in `coatedSteel`.
