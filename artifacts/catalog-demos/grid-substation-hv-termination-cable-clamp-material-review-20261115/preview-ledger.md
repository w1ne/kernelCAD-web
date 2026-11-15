# Five-preview ledger — 2026-11-15 (grid-substation)

Lane PR #1406 was green at round start (17/17 checks pass). No earlier ledger under `artifacts/catalog-demos/` names these five assets, and no test under `tests/` references them. Open-issue and open-PR searches for `grid-substation` returned no open items. The only earlier `grid-substation` work is #1298 (cable ladder, merged) and the `busbar-expansion-joint` row in the cartridge-filter ledger.

All five checked-in default previews were opened (`samples/`, `previews/before/substation-hv-cable-termination.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `grid-substation/substation-hv-cable-termination` | 1,392 / 1,800 | `6f6e7bf3e4a72769a0b6c5f398a0f25fb1751d4c1324f1931b4617c58741e68e` | `9eeb8858ebca1334780f844d2cac06d14f51c3430e8e813def6d61314bdf57ef` | **Material defect, corrected.** `cable-clamp` (386 x 386 x 180 mm block round the cable at the base) used `cableJacket` (`#263d50`), the colour of the cable riser. A termination support clamp is metal hardware, and the base plate under it is already `galvanizedSteel`. The clamp rendered as a dark-blue block that merged with the cable. **Geometry defects, recorded and not corrected:** `terminal-pad` floats about 367 mm above the top shed (shed top `z = 1,913`, pad bottom `z = 2,280`); the clamp bottom (`z = 230`) is 20 mm above the base top (`z = 210`); the clamp encloses the riser, so the inspector reports `mechanism.interpenetration` (badge present before and after). |
| `grid-substation/substation-coupling-capacitor` | 252 / 1,800 | `4679194cd43444cf2c376ec888ce3f512163622ace43e3e95eec19bdad3e6f46` | `a1fcce80c2faf0fef1c23b99f60197d7886fd80d6aac9a34cd96013fd0f13ed8` | **Material defect, recorded and not corrected:** the four `divider-section-*` parts use `powderCoat` (green painted steel). A coupling-capacitor stack is a porcelain or polymer insulator housing. Not fixed this round: the asset has no insulator knob, so the fix adds a control. **Geometry defect:** plain stepped cylinders with no sheds; no top terminal. |
| `grid-substation/substation-surge-arrester` | 304 / 1,800 | `e02385be912767b599a03f3379c1323c784127b713c52ebb88af23e327fce8cf` | `dbaa4176248ab8ce6e1ca5038ae9b0840735b76b31d896e64d81c9d45f5aac76` | No material defect: galvanized base, porcelain sections, copper terminal. **Geometry defect, recorded:** `top-terminal` floats above the top section (section 6 top `z = 1,992`, terminal bottom `z = 2,230`); the sections are plain cylinders with no sheds. |
| `grid-substation/substation-line-trap` | 280 / 1,800 | `73515a0fd0023d9d0e1b20d4dda29fca0584ba081826a5af994f46619945a18c` | `30ad0f05172c64969682cc9cbb6c2bedaa16d9f1f3a3d03eec6cc5eccdc84fed` | No clear material defect: copper coil, galvanized frame. Terminal pads use `stainlessSteel`; aluminium is more usual, but stainless is a plausible finish, so not changed. **Geometry defect, recorded:** the five `coil-turn-*` cylinders are nested solids and read as one closed drum; a line trap is an open air-core coil, normally hung from or stood on post insulators, which this asset does not have. |
| `grid-substation/substation-dead-tank-breaker` | 6,544 / 7,000 | `7fc584990499423cf2dfe78bd33056c3d46c32f56f759fba2a2dca06b70db667` | `1abd218a9b36cc01a368948848ecf9a5822cb4b04467d9e908cdbb53a5fe2b7c` | No material defect in the render: brown glazed porcelain bushings, painted tanks, galvanized frame. **Naming defect, recorded:** the knob `copper` is labelled "Aluminium terminals" and defaults to aluminium grey; the render is right, the control id is misleading. Changing a param id breaks saved overrides, so not changed. |

## Correction

Only `substation-hv-cable-termination` is changed. `cable-clamp` now uses `galvanizedSteel`, as the base plate already does. `cableJacket` stays on `cable-riser`, so all four colour controls stay in use. Geometry, part names, triangle count (1,392), the four colour controls, their defaults and the two presets are unchanged. `scripts/checkCatalogQuality.py --kit grid-substation`: 80/80 pass.

Regression: `tests/integration/catalog/substationHvTerminationClampMaterial.test.ts` reads the palette zones and the exported GLB colours. It fails on the baseline source (`expected [ 'base' ] to deeply equal ArrayContaining ["base", "cable-clamp"]`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/substation-hv-cable-termination.png`. 2,241 pixels differ (difference > 8 on any channel), all inside the clamp area (bounding box x 218-293, y 323-367). Enlarged crops: `previews/{before,after}/clamp-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/grid-substation/substation-hv-cable-termination.kcad.ts <out>`: `previews/{before,after}/inspect-iso.png`.
- Review MP4 (21 s): `grid-substation-hv-termination-cable-clamp-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after default preview at 19 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- The simple `grid-substation` insulator assets (surge arrester, HV termination) put the top terminal several hundred millimetres above the insulator stack. A geometry pass on the kit should check every top fitting for contact.
- `coupling-capacitor` and `current-transformer` have no insulator material at all; both need a porcelain/polymer control added, not a colour swap.
