# Five-preview semantic audit — 20 November 2026 (EV charging site equipment)

## Selection and exclusions

Reviewed the current rendered previews for five ev-charging-infrastructure assets: `site-energy-management-controller`, `charger-canopy-column-base`, `curbside-lamp-charger`, `streetlight-charger-arm` and `fleet-charging-canopy`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The open-PR search for `charger-canopy-column-base` returns only the lane PR #1507 itself; no other open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open and mergeable at the audit base commit `2edc71a75`; its `changes`, `lint`, `changed-tests` and `test (draft-light)` checks had passed and `build-and-checks` was in progress. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`site-energy-management-controller` drew `antenna-left` and `antenna-right` with the `powderCoat` control ("Powder-coated metal"), which also colours the enclosure. A controller antenna is a whip in a polymer radome on a metal connector; a painted metal sleeve would block the signal. The preview showed two thick teal rods in the enclosure colour.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `site-energy-management-controller` | A teal wall enclosure with a screen, an amber button and two grey vent bars. Two thick teal rods stand above the top. A grey band wraps the middle of the enclosure side and top. The source confirms it: each antenna is a radius 18 mm rod on `powderCoat` that starts at z = 770 mm, 18 mm above the top cap (z = 752 mm). `mounting-plate` is at y = 30 mm to 60 mm, inside the 300 mm deep enclosure, so only its rim shows as a band. `status-button` is an upright cylinder 9 mm in front of the door. | Selected: give the antennas a polymer control and steel connectors on the top cap; move the plate to the rear wall; seat the button on the door. |
| `charger-canopy-column-base` | A tall grey square post on a grey base plate with four teal blocks around the foot and four bolt heads. The source confirms it: post, shoe, plate and bolts use `stainlessSteel`; the four gussets use `powderCoat`. A canopy column is galvanized or painted structural steel, and a welded gusset has the same finish as its column. `gusset-0` and `gusset-1` are 90 mm thick slabs flat against the shoe; `gusset-2` and `gusset-3` point outward. | Second material mismatch. Noted for a later round. No change. |
| `curbside-lamp-charger` | A grey mast on a round grey base, a teal charger box with a screen at mid height, and a grey arm with a teal light head. The arm also sticks out 265 mm behind the mast, so the top reads as a T. The source confirms it: `light-arm` spans x = -265 mm to 445 mm. `light-head` has no lens part. `lamp-mast` uses `stainlessSteel`; street-light masts are normally galvanized steel or aluminium. A polymer holster and a glass screen on a painted box are a plausible material set. | Arm overhang, missing lens and mast label noted. No change. |
| `streetlight-charger-arm` | The same shape as the curbside lamp charger with a taller mast. The source confirms it: the two files differ only in mast height (3,480 mm against 2,680 mm) and the matching arm and head heights. The same limits apply. | Near-duplicate geometry noted. No change. |
| `fleet-charging-canopy` | A grey flat roof in two slabs with a teal ridge tube, four grey corner columns, four full-height dark teal walls and four grey posts between them. The source confirms it: `front-rafter` and `rear-rafter` are 4,100 mm × 1,250 mm × 130 mm slabs on `stainlessSteel`, so they are roof panels, not rafters. The four `bay-divider-*` parts are 3,600 mm tall walls in a shelter that the description calls open. Each `cable-drop-*` is a horizontal 700 mm rod, not a hanging cable. | Roof-slab label, full-height dividers and horizontal cable drops noted for a later round. No change. |

## Correction

Before, `antenna-left` and `antenna-right` used `powderCoat` (#397f90). The source had four colour controls: `powderCoat`, `displayGlass`, `safetyPolymer` and `stainlessSteel`.

After:

- `antennaPolymer` ("Antenna radome polymer", default #2b3236) colours `antenna-left` and `antenna-right`. Each whip is 300 mm long with a radius of 11 mm.
- New parts `antenna-mount-left` and `antenna-mount-right` use `stainlessSteel`. Each is a connector 30 mm tall with a radius of 16 mm. It stands on the top cap at z = 752 mm, and the whip stands on it.
- `mounting-plate` (560 mm × 780 mm × 30 mm, `stainlessSteel`) is now at y = 150 mm to 180 mm, against the enclosure rear wall. It shows as a rim on the wall side and above the cap.
- `status-button` (`safetyPolymer`) is a round button with its axis toward the operator. Its rear face is on the door face and it stands 18 mm proud.
- The `fleetReady` and `nightService` presets keep their names and now also set `antennaPolymer` (dark green-black and white radomes).

The mesh goes from 240 to 328 triangles in a 2,400-triangle budget. The header comment, the description and the kit README row now name the rear mounting plate, the polymer-sheathed antennas and the new control.

Compatibility note: the four earlier colour controls keep their names, labels and defaults. `powderCoat` no longer colours the antennas; a saved scene that relied on it for the antennas must set `antennaPolymer`. All twelve earlier part names are kept; two connector parts are added. The bounds change from 0.56 m × 0.352 m × 1.10 m to 0.56 m × 0.3585 m × 1.082 m (width × depth × height), because the plate moves behind the enclosure and each antenna now starts on the cap.

Noted, not corrected: `cable-gland-strip` is a block inside the enclosure, so the cable glands that the description names do not show. `display-bezel` shares the `displayGlass` control with the display window (the same limit as 21 other assets in this kit). The vent slots are raised stainless bars, not openings. The preview renderer draws the white `nightService` radome as mid grey.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (no `antennaPolymer` control); it passes after the correction (1/1). It checks the five colour controls and the new label, the preset keys, the finish of twelve parts, that each connector stands on the top cap and each whip on its connector, that the whip is slimmer than the connector, that the plate touches the enclosure rear wall, that the button sits on the door face with its axis toward the operator, the triangle count and the overall bounds.
- ESLint is clean. The ev-charging-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 178 files / 248 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its colour controls match the corrected source. The result is in `verification/index-row-check.json`.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, radio performance, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
