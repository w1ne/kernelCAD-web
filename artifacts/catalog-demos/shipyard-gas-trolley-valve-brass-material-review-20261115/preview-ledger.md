# Five-preview ledger — 2026-11-15 (shipyard)

Lane PR #1406 was open at round start. Its checks were in progress (12 pass, 4 running, 0 failing). No earlier ledger under `artifacts/catalog-demos/` and no single-asset test under `tests/` names these five assets. Open-issue and open-PR searches for `shipyard` returned no open items. Earlier `shipyard` audits covered only `abrasive-blast-pot`, `blast-dust-collector`, `hull-panel-turnover-cradle` and `weld-inspection-light-stand`.

All five checked-in default previews were opened (`samples/`, `previews/before/welding-gas-cylinder-trolley.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `shipyard/welding-gas-cylinder-trolley` | 428 / 1,800 | `c7eeaf1c1cd8e2e4cc168ef8ec8a022134acc148c87d27b04b176411ee4dc117` | `6b03b8f4c3f177a9b93f99e578eb411cad85f84d8aeb35860d5d7521fb65eaf3` | **Material defect, corrected.** The two `cylinder-valve-neck-*` parts (valve bodies, r 72 x 90 mm on top of each cylinder) used `structuralSteel` (`#b6c1c4`), the colour of the trolley toe plate and pull handle. Industrial gas cylinder valves are forged brass; `props/gas-cylinder` already shows its valve as brass (`#c9a43a`). The valves rendered as grey frame steel. **Geometry defects, recorded and not corrected:** the pull handle is one 90 x 110 mm post at the -X side, not a frame behind the cylinders; the description names a wheel guard that is not modelled; the retaining bands (y -290 to -160) cut into the cylinders (r 210), and the inspector reports `mechanism.interpenetration` (badge present before and after). |
| `shipyard/plate-rolling-machine` | 2,108 / 3,000 | `9a6e9f3f430e311241585a1181022fb180e0fa73c9beef83e9c9d554ccf3d6de` | `38c0ec11072992f939a47a5a362f5a3fd3b865e1f94571c54da81b57ffe6b1cb` | No material defect: painted housings, polished rolls, yellow hydraulic cylinders, mill-scale plate, concrete plinth. **Control naming, recorded:** `coupling-guard` uses the `hydraulic` control ("Hydraulic cylinders and power pack"). Safety yellow is right for a guard, so the render is right; only the control grouping is loose. |
| `shipyard/plasma-cutting-gantry-head` | 2,164 / 3,000 | `6908bf4c7ebabf079b961ef38b51fe107a61f4566453cd738004600432608835` | `606a5f803535b46324dc1f5a0b5b9199b2eca87bebde89b6e0cc7e98d8b12044` | No material defect: painted gantry, steel rails, rack and slats, dark plate, copper-colour shield cup. **Readability, recorded:** `plate` and `table-frame` share the `cuttingTable` control, so the plate separates from the table only by the slats and kerf lines. The control label says so; not changed. |
| `shipyard/pipe-spool-rotator` | 2,968 / 4,000 | `070a2922dba06e147942effd7342b488341201110b6329e0fb5e6ba6fed6a7c5` | `8b2b7c4dba38fe3000bfc00d42d4273d60fd86649487ee1aa6ea8411b831c0d6` | No material defect: polyurethane tyres on steel hubs, painted stands and gearmotor, dark pipe spool with weld bands, yellow pendant and pedal. No defect found. |
| `shipyard/electrode-storage-oven` | 280 / 1,800 | `fc9a578e0728257781bf7f184fd4b18b543683296e063affdd9b71341d500a78` | `604196c2173ecbc8739553f22bab101a83101f83cedd1d51e88fbcc0e8a18891` | No clear material defect: a rod oven is a painted steel cabinet. **Geometry defects, recorded:** the four `rack-foot-*` parts (z 70 to 310) are fully inside the toe kick (z 0 to 150) and cabinet (z 60 to 1,600), so they are not visible; `control-panel` (x 490 to 730) is half inside the cabinet side wall (half-width 560); no door handles, hinges or thermostat. The preview reads as a brown box. Candidate for a geometry rebuild, not a colour change. |

## Correction

Only `welding-gas-cylinder-trolley` is changed. Both `cylinder-valve-neck-*` parts now use a fixed brass finish (`valveBrass = "#c9a43a"`, the `props/gas-cylinder` valve default). The T-handles stay `structuralSteel`: cylinder valve handwheels vary (brass, steel, polymer), so no change is justified. No control is added or removed: the four colour controls, their defaults and both presets are unchanged, and `structuralSteel` still drives the toe plate, pull handle and valve handles. Geometry, part names and triangle count (428) are unchanged. `scripts/checkCatalogQuality.py --kit shipyard`: 70/70 pass.

Regression: `tests/integration/catalog/shipyardGasTrolleyValveMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (`cylinder-valve-neck-0 should be brass`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/welding-gas-cylinder-trolley.png`. 1,149 pixels differ (difference > 8 on any channel), all inside the valve area (bounding box x 212-315, y 56-102). Enlarged crops: `previews/{before,after}/valve-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/shipyard/welding-gas-cylinder-trolley.kcad.ts <out>`: `previews/{before,after}/inspect-iso.png`.
- Review MP4 (21 s): `shipyard-gas-trolley-valve-brass-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after crop at 15.5 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- The generator-built shipyard props (`b(...)`/`c(...)` helpers, two to four knobs) put small fittings on the frame-steel control. Check other cylinder, valve and gauge parts in the kit for the same default.
- `electrode-storage-oven` needs a geometry pass: visible feet, a side-mounted control box, door handles.
