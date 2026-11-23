# Five-preview semantic audit — 20 November 2026 (EV charging plugs and posts)

## Selection and exclusions

Reviewed the current rendered previews for five ev-charging-infrastructure assets: `charger-status-display-post`, `ccs-combo-1-connector`, `chademo-connector`, `j1772-ac-connector` and `overhead-cable-balance-arm`. These source paths are absent from the open catalog PR #1507 diff (`git diff --name-only origin/develop...HEAD`). No open issue and no open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open and mergeable at the audit base commit `47044ace4`; its `changes`, `lint`, `changed-tests` and `test (draft-light)` checks had passed and `build-and-checks` was in progress. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`charger-status-display-post` drew `display-bezel` with the `displayGlass` control ("Display glass"), the same control as `display-window`. A bezel is the opaque frame around the glass, not glass. The preview showed one pale blue block with no visible frame. The screen was also on the lower cabinet door at z = 354 mm, while the description calls this a "wayfinding-height display post" and the 1.7 m column carried nothing.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `charger-status-display-post` | A teal cabinet on a teal ground plate, a tall teal column and a wide teal head cap. A small pale blue block sits on the cabinet door at knee height, with no dark frame. The source confirms it: `display-bezel` (151.8 mm × 88.4 mm) and `display-window` both use `displayGlass` (#79cfda) and are at z = 354 mm to 442 mm. Nothing is on the column between z = 560 mm and 1,740 mm. | Selected: give the bezel a screen bezel polymer control and move the screen to the column head. |
| `ccs-combo-1-connector` | A black plug with grey grip flanks, a light grey latch over the top, a round head with five gold pins above a separate shroud with two gold DC sockets, and a black cable from the grip butt. The source confirms the "snowman" nose: AC head on z = 0, DC shroud below it. Polymer housing, elastomer overmould, brass contacts and a cable jacket are a plausible material set. | No mismatch found. No change. |
| `chademo-connector` | A white barrel with a black ribbed coupling sleeve, a round black face with two large and eight small gold pins, an orange lever along the top, a black pistol grip with an orange trigger and a black cable. The colours match the controls: `barrel` polymer, `grip` rubberised, `lever` and trigger, `contacts` brass, `cable`. | No mismatch found. No change. |
| `j1772-ac-connector` | A white plug with a round nose, five gold contacts in a black recessed face, black grip flanks, a blue latch over the top and a black cable. The source places the five contacts in the J1772 layout (two AC, ground, proximity, pilot) and the nose key below the face. | No mismatch found. No change. |
| `overhead-cable-balance-arm` | A grey stainless floor mast on a grey plate, a grey arm at the top with a teal counterweight at the rear and a teal box at the front, and two thin black cables that hang from the arm and stop in mid-air at about 1.96 m. The source confirms it: `base-plate`, `support-mast`, `swing-arm` and `arm-pivot` use `stainlessSteel`; the two cable drops end with no connector or holster. | Mast finish (the same note as `charger-cable-retractor`) and cable drops with no connector noted for a later round. No change. |

## Correction

Before, `display-bezel` and `display-window` both used `displayGlass` (#79cfda). The source had four colour controls: `powderCoat`, `displayGlass`, `safetyPolymer` and `engineeringPolymer`.

After:

- `bezelPolymer` ("Screen bezel (black polymer)", default #1f2427) colours `display-bezel`. The bezel is 290 mm × 260 mm, 8 mm deep, and is 20 mm larger than the glass on each side.
- `display-window` keeps `displayGlass`. It is 250 mm × 220 mm and stands 3 mm proud of the bezel.
- New part `display-housing` (`powderCoat`, 330 mm × 30 mm × 360 mm) sits on the column front, z = 1,380 mm to 1,740 mm, and meets `head-cap`. The bezel sits on its face. The glass bottom edge is at z = 1,450 mm.
- The `fleetReady` and `nightService` presets keep their names and now also set `bezelPolymer`.

The mesh goes from 252 to 264 triangles in a 2,400-triangle budget. The header comment, the description and the kit README row now name the screen bezel and the new control.

Compatibility note: the four earlier colour controls keep their names, labels and defaults. `displayGlass` no longer colours the bezel; a saved scene that relied on it for the frame must set `bezelPolymer`. All thirteen earlier part names are kept; `display-bezel` and `display-window` move from the cabinet door to the column head, and one part (`display-housing`) is added. The bounds change from 0.5022 m × 0.32 m × 1.785 m to 0.5022 m × 0.321 m × 1.785 m (width × depth × height), because the glass stands 1 mm farther forward than the old bezel did.

Noted, not corrected: `left-connector-cradle` and `right-connector-cradle` are horizontal stubs on the cabinet sides with no connector shape. `main-enclosure` starts at z = 0, so the ground plate is inside it. The vent slots are raised bars, not openings. `status-button` is an upright cylinder in front of the door. Seventeen other assets in this kit still colour `display-bezel` with `displayGlass`.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (no `bezelPolymer` control); it passes after the correction (1/1). It checks the five colour controls and the new label, the preset keys, the finish of nine parts, that the glass bottom edge is above 1.4 m, that the housing meets the head cap and touches the column front, that the bezel sits on the housing face, that the glass stands 3 mm proud of the bezel, that the bezel frame is 20 mm on each side, and the triangle count.
- ESLint is clean. The ev-charging-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 180 files / 250 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its colour controls match the corrected source. The result is in `verification/index-row-check.json`.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
