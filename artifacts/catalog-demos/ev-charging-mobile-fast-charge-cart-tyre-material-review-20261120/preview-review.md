# Five-preview semantic audit — 20 November 2026 (EV charging site equipment)

## Selection and exclusions

Reviewed the current rendered previews for five ev-charging-infrastructure assets: `mobile-fast-charge-cart`, `coiled-charging-cable-reel`, `charger-cable-retractor`, `ev-metering-pedestal` and `home-ac-wallbox`. These source paths are absent from the open catalog PR #1507 diff (`git diff --name-only origin/develop...HEAD`). No open issue and no open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open and mergeable at the audit base commit `3915f3c63`; its `changes`, `lint`, `changed-tests` and `test (draft-light)` checks had passed and `build-and-checks` was in progress. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`mobile-fast-charge-cart` drew `left-wheel` and `right-wheel` with the `powderCoat` control ("Powder-coated metal"), which also colours the enclosure. A cart wheel has a rubber tyre on a metal hub. The preview showed two teal drums in the enclosure colour.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `mobile-fast-charge-cart` | A teal cabinet with a screen, an amber button and four vent lines. The cabinet stands on the ground and passes through a teal collar at knee height. Two short teal drums stand upright on the ground in front of the door. The source confirms it: each wheel is a radius 68 mm cylinder on `powderCoat` with a vertical axis, 30 mm above the ground at y = -360 mm, 100 mm in front of the door. `main-enclosure` starts at z = 0 and `cart-chassis` is at z = 180 mm to 270 mm, so the cart rests on its enclosure. `push-handle` floats 65 mm and `cable-reel` 25 mm behind the rear wall. `status-button` is an upright cylinder 9 mm in front of the door. | Selected: give the wheels a tyre rubber control, painted hubs and horizontal axles; stand the enclosure on the chassis; seat the handle, reel and button. |
| `coiled-charging-cable-reel` | A grey wall plate with two large grey ten-sided discs, a teal block between them, and a teal sleeve with a straight black rod at the lower front. No cable is on the drum. The source confirms it: `spool-core` is an upright cylinder (vertical axis) between two flanges whose axis is horizontal, so the core is at a right angle to the axle. `cable-tail` is a straight 500 mm rod through `cable-outlet-guide`. Steel flanges and a painted drum are a plausible material set. | Missing coiled cable and upright spool core noted for a later round. No change. |
| `charger-cable-retractor` | A grey floor mast on a grey base plate with a grey arm, a teal box at the arm end, a short teal drum below the box and a thin black vertical cable. The source confirms it: the description calls it an "overhead retractor body", but the model is a 2,770 mm floor mast. `pulley` is a drum with a vertical axis, so a cable cannot run over it. The mast, arm and plate use `stainlessSteel`; structural masts are normally galvanized or painted steel. | Pulley axis, floor mast against the "overhead" label and mast finish noted. No change. |
| `ev-metering-pedestal` | A grey post on a grey plinth with a teal head, a pale blue window, a teal half-disc on the window and a teal door on the post. The source confirms it: `meter-dial` is a cylinder with a vertical axis, so it lies flat and shows as a shelf, not as a dial face. `cable-riser` (radius 48 mm, z = 0 to 250 mm) is inside the plinth and the post, so `powderCoat` has no visible effect on it. A painted head on a stainless post is a plausible material set. | Flat dial and hidden riser noted for a later round (placement, not material). No change. |
| `home-ac-wallbox` | A teal wall box with a cap, a screen, an amber button, three vent lines, a teal plate behind it and a grey block at the right side. The source confirms it: `cable-hook` is a horizontal rod at x = 220 mm, 41 mm outside the enclosure side (x = 155 mm), so it floats. `side-holster` is 19 mm off the same side. `mounting-plate` is at y = 86 mm to 114 mm and the enclosure rear wall is at y = 105 mm, so 19 mm of the plate is inside the enclosure. `status-button` is an upright cylinder in front of the door. Home wallboxes commonly have polymer housings; a painted metal housing is plausible. | Floating hook and holster, sunk plate and upright button noted for a later round. No change. |

## Correction

Before, `left-wheel` and `right-wheel` used `powderCoat` (#397f90). The source had four colour controls: `powderCoat`, `displayGlass`, `cableElastomer` and `safetyPolymer`.

After:

- `tyreRubber` ("Wheel tyre rubber", default #23282b) colours `left-wheel`, `right-wheel`, `rear-left-wheel` and `rear-right-wheel`. Each tyre has a diameter of 200 mm and a width of 60 mm. Its axle is horizontal, along the cart width. The tyre stands on the ground against the chassis side.
- New parts `left-wheel-hub`, `right-wheel-hub`, `rear-left-wheel-hub` and `rear-right-wheel-hub` use `powderCoat`. Each hub has a radius of 42 mm and stands 8 mm proud of the tyre.
- `cart-chassis` is at z = 70 mm to 160 mm. `main-enclosure` (1,000 mm tall) stands on it; the top stays at z = 1,160 mm. `front-door` starts 40 mm above the chassis.
- New parts `handle-bracket-left` and `handle-bracket-right` (`powderCoat`) carry `push-handle` from the rear wall. `cable-reel` touches the rear wall.
- `status-button` (`safetyPolymer`) is a round button with its axis toward the operator. Its rear face is on the door face and it stands 18 mm proud.
- The `fleetReady` and `nightService` presets keep their names and now also set `tyreRubber`.

The mesh goes from 384 to 672 triangles in a 2,400-triangle budget. The header comment, the description and the kit README row now name the four rubber-tyred wheels and the new control; the word "casters" is removed because the wheels do not swivel.

Compatibility note: the four earlier colour controls keep their names, labels and defaults. `powderCoat` no longer colours the tyres; a saved scene that relied on it for the wheels must set `tyreRubber`. All sixteen earlier part names are kept; `left-wheel` and `right-wheel` are now the front pair, and eight parts are added (two rear wheels, four hubs, two handle brackets). The bounds change from 0.82 m × 1.178 m × 1.182 m to 0.956 m × 1.05 m × 1.182 m (width × depth × height), because the wheels move from the front of the door to the chassis sides.

Noted, not corrected: `cable-tail` is a straight horizontal 440 mm rod behind the reel, not a coiled or hanging cable. The four wheels are fixed; none swivels. `push-handle` is a 60 mm bar. `display-bezel` shares the `displayGlass` control with the display window (the same limit as 21 other assets in this kit). The vent slots are raised bars, not openings. `docs/benchmarks/token-efficiency/sample-manifest.json` holds a frozen hash of the earlier source of this asset; no test reads it and it is left as is.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (no `tyreRubber` control); it passes after the correction (1/1). It checks the five colour controls and the new label, the preset keys, the finish of eighteen parts, that each tyre stands on the ground with a horizontal axle against the chassis side, that each hub shares the axle and stands proud of the tyre, that the enclosure stands on the chassis, that the brackets join the rear wall to the handle, that the reel touches the rear wall, that the button sits on the door face, the triangle count and the overall bounds.
- ESLint is clean. The ev-charging-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 179 files / 249 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its colour controls match the corrected source. The result is in `verification/index-row-check.json`.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, load rating, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
