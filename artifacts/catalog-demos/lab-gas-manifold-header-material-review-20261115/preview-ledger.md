# Five-preview ledger — 2026-11-15 (lab-infrastructure service equipment)

Lane PR #1406 was open at round start. Its CI was running, and no checks had failed. Selection: `lab-infrastructure` has 60 assets, and only 4 of them are named in an earlier ledger (`cleanroom-fan-filter-unit`, `laboratory-fume-hood`, `laboratory-gas-cylinder-cabinet`, `laminar-flow-workbench`). The five assets below are not named in any ledger under `artifacts/catalog-demos/`. No test under `tests/` audits them, and no open PR or issue touches them. The only history of `lab-gas-manifold-panel` is the original wave (#1217) and the quality promotion `c139f2597`.

All five checked-in default previews were opened (`samples/`, `previews/before/lab-gas-manifold-panel.png`), and the colour assignments in each source were read.

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `lab-infrastructure/lab-gas-manifold-panel` | 320 / 1,800 | `3ff10470b63ce2d733ca8d0153cc1fbafd0cf5226b84768d99eea3fcce10005b` | `96f5d48b088f4701f81978844f02165f970a5efd4c2a143c0d8035c88a6149f3` | **Material defect, corrected.** `main-header` is the gas header that feeds the four stainless `valve-riser-*` pipes. It used `enamel`, the painted mounting-plate coating, so the header was the same colour as the plate. In the front inspection view it cannot be seen at all, and in the catalog preview it reads as a painted ledge on the plate, not as a pipe. |
| `lab-infrastructure/laboratory-safety-shower` | 1,324 / 1,800 | `c30f7efe9d27b134090ab7ce3fc641a0bf8b5a8be79f122dc4c4e3d1c17d6951` | `d9e3ba26ba7f65654259db988d9c600581d12004bfa1c89c0939743ed032932c` | No clear material defect. Safety-yellow enamel pipe, fittings and ball valve; stainless drench head, eyewash bowl and pull rod; orange polymer dust caps, push flag and triangle handle; green sign. Minor: the sign cross uses `stainless` (`#c6ced1`), so it renders light grey where a sign would show white. |
| `lab-infrastructure/fume-exhaust-riser` | 1,958 / 2,200 | `feab8f11adb08b058a4eb9e59cb429b8a888105a0a5bc8364dccae5999b42cc4` | `2a4ba81c15175c04981da95c0bf8e96833befb4d590aa03a1b8381c597086970` | No material defect. Stainless duct, sump, branch inlet and discharge nozzle; dark steel flanges and bolts; enamel stand and wall brackets; amber polymer actuator and airflow bands. |
| `lab-infrastructure/cryogenic-dewar-storage-rack` | 2,542 / 2,600 | `7e3e2705ee0408d6ceabb6f35968df9cde0f62e86061dbc1b6c2f92a0e698612` | `f02f6dea33fc140b3a5b321aa3c2c3f42cce86ff66d7b7901f1f20cbf1bfcaab` | No clear material defect. Aluminium dewars and necks, blue foam neck plugs and caps, yellow restraint hoops and latches, dark steel rack and roller bases, rubber casters. The blue `label-band-*` uses the `foam` control; a coloured identification band is plausible. |
| `lab-infrastructure/articulated-extraction-snorkel` | 1,284 / 1,800 | `551552ff12b58116ecf3c1e0c85da3cc2cee57fd92daf278386fcd4aef7fdda2` | `6c12419fb58e285c23cb4b28140de2e3266289cd310c7cd03c5efbb8988c1d4f` | No material defect. Aluminium arm tubes and stem, white enamel knuckles and collars, red tension knobs, clear acrylic bell hood, steel bench flange and damper. |

## Correction

Only `lab-gas-manifold-panel` is changed. `main-header` now uses the `stainless` control (`#b8c7ca`, "Stainless steel"), the same control as the valve risers it feeds. The mounting plate keeps `enamel`. The four colour controls, their defaults and the two presets are unchanged. Geometry, part names and triangle count (320) are unchanged. A source comment now names the header as stainless. `scripts/checkCatalogQuality.py --kit lab-infrastructure`: 60/60 pass.

Regression: `tests/integration/catalog/labGasManifoldHeaderMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`main-header should be stainless steel`, see `verification/test-before.txt`) and passes after the fix.

Source SHA-256 after: `665eec51668c1eded6e465a6f68d5504a672515e1cbf0afdf4714f7bee450042`. Preview SHA-256 after: `2450cc4b2cce4e3700d012c1ae40c6fc1229e897ed0838831e747f001f498476`.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/lab-gas-manifold-panel.png`. 6,701 pixels differ (difference > 8 on any channel), all inside the header region (bounding box x 170-420, y 204-292). Enlarged crops: `previews/{before,after}/header-crop.png`. In this lit preview the change is small, because the enamel (`#c9dedc`) and stainless (`#b8c7ca`) defaults are close in value.
- Inspection front views from `npx kernelcad render inspect <source> <out>`: `previews/{before,after}/inspect-front.png`. Before, the header cannot be seen against the plate; after, it shows as a separate stainless bar under the risers.
- Review MP4 (21 s): `lab-gas-manifold-header-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after inspect front at 12 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Defects noted but not changed in this round

- `lab-gas-manifold-panel` is still a weak model: 320 triangles, built only from boxes and cylinders. The `valve-handle-*` boxes (z 532-548) float above the riser tops (z 511), and the `outlet-*` boxes (z 616-651) float above the handles. The description promises "paired inlet headers" and "isolation wheels", but the model has one header and flat bar handles. `render inspect` reports `mechanism.interpenetration` both before and after this change, because the risers pass through the header. A later round can rebuild this asset with connected outlets, round handwheels and a real pipe header.
- `laboratory-safety-shower`: the first-aid sign cross shows light grey (`stainless`), not white.
