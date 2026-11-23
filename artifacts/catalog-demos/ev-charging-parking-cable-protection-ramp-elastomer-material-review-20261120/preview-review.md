# Five-preview semantic audit — 20 November 2026 (EV charging site furniture)

## Selection and exclusions

Reviewed the current rendered previews for five ev-charging-infrastructure assets: `parking-cable-protection-ramp`, `charging-island-plinth`, `ev-charger-protection-bollard`, `charging-station-direction-sign` and `wall-mounted-connector-holster`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The open-PR search for `charging-station-direction-sign` returns only the lane PR #1507 itself; no other open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `a7b66a981`; its `changes` check had passed, and `lint`, `build-and-checks` and `changed-tests` were in progress or queued. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`parking-cable-protection-ramp` drew its `ramp-base` and anchors with a `stainlessSteel` control ("Stainless steel") and its covers, divider and end slopes with a `powderCoat` control ("Powder-coated metal"). A drive-over cable protector is a moulded rubber or polyurethane body with hinged polymer lids. The preview showed a grey steel slab with teal metal blocks on it and no ramp.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `parking-cable-protection-ramp` | A long grey slab with vertical sides. Two tall teal blocks and a low teal bar stand on it, and a teal block closes each end. No slope and no anchor shows. The source confirms it: `ramp-base` is a 1,240 mm × 360 mm × 68 mm box on `stainlessSteel`; the `end-slope-*` parts are 110 mm × 360 mm × 82 mm boxes; `anchor-left` and `anchor-right` (radius 28 mm, z = 0 mm to 75 mm) are inside the base and the covers. | Selected: replace both metal controls with rubber, polymer lid and anchor steel controls; draw the sloped flanks and end caps; put the anchors on the flanks. |
| `charging-island-plinth` | A teal two-step slab with two grey blocks on top and four teal stubs at the corners. The source confirms it: `island-curb` (2,600 mm × 820 mm × 180 mm) and `raised-deck` use `powderCoat` ("Powder-coated metal"), and the two mount pads are 180 mm solid blocks on `stainlessSteel`. A site island and its curb are concrete. | Second material mismatch. Noted for a later round (best next correction in this kit). No change. |
| `ev-charger-protection-bollard` | A grey ribbed post on a round grey flange with four small bumps, and a teal cap. Stainless post, powder-coated cap and stainless anchors are a plausible material set. The description names a "square anchor plate"; the source draws `anchor-flange` as a round 12-sided disc of radius 150 mm. | Round flange against the "square" description noted. No material change. |
| `charging-station-direction-sign` | A thin grey post in a teal ground block. An amber sign face in a teal frame, a second teal panel with a short bar, and a small teal cap that floats above the post. The source confirms it: `sign-post` ends at z = 2,720 mm and `top-cap` starts at z = 2,780 mm, a 60 mm gap. `arrow-shaft` is a plain bar; no arrow head is drawn. `ground-sleeve` is a 280 mm × 260 mm × 220 mm block on `powderCoat`. A polymer sign face on a painted panel and a steel post is a plausible material set. | Floating cap and missing arrow head noted for a later round. No material change. |
| `wall-mounted-connector-holster` | A grey wall plate with a dark open-front cradle and a round peg below the front lip. Polymer cradle and hook on a stainless plate are a plausible material set. `cable-hook` is a straight horizontal peg with no upturned end. | Straight hook peg noted. No change. |

## Correction

Before, the source had two colour controls: `powderCoat` (#397f90; `cover-left`, `cover-right`, `center-divider`, `end-slope-left`, `end-slope-right`) and `stainlessSteel` (#b5c0c2; `ramp-base`, `anchor-left`, `anchor-right`).

After:

- `rampElastomer` ("Moulded rubber", default #474b50) colours `ramp-base`, `center-divider`, `end-slope-left` and `end-slope-right`.
- `coverPolymer` ("High-visibility polymer lid", default yellow #f2b824) colours `cover-left` and `cover-right`.
- `anchorSteel` ("Galvanized anchor steel", default #b5c0c2) colours `anchor-left`, `anchor-right` and the new `anchor-left-rear` and `anchor-right-rear`.
- `ramp-base` is a trapezoid section 1,120 mm long along the cable run (X). It is 500 mm wide at the ground and 220 mm wide at the 70 mm deck, so both long flanks slope at about 27°. Vehicles cross along Y.
- Each lid is 540 mm × 180 mm and stands 6 mm proud of the deck. `center-divider` is a 24 mm rubber rib between the lids, 8 mm proud of the deck.
- Each end slope is a 60 mm cap that falls from deck height at the body end to the ground at the tip.
- Each anchor is a 16 mm radius bolt head, 46 mm tall, on a flank 185 mm from the centre line. The flank is 32.5 mm high there, so the head stands 13.5 mm above it.
- The `fleetReady` and `nightService` presets keep their names and now set the three new controls.

The mesh goes from 160 to 240 triangles in a 2,400-triangle budget. The header comment, the description and the kit README row now name the moulded rubber body, the polymer lids and the anchors.

Compatibility note: the `powderCoat` and `stainlessSteel` controls are removed, because no part of a rubber cable protector uses either finish. A saved scene that set them on this asset must set `coverPolymer`, `rampElastomer` or `anchorSteel` instead. All eight earlier part names are kept; two anchor parts are added. The bounds change from 1.33 m × 0.36 m × 0.15 m to 1.24 m × 0.50 m × 0.078 m (length × width × height), because a 150 mm tall block with vertical sides is not a drive-over ramp.

Noted, not corrected: the lids are closed, so the cable channels do not show. No lid hinge, tread pattern or end connector lug is drawn. The anchor heads are upright cylinders, not countersunk bolts. The preview renderer shades the dark rubber flank and end cap close to one tone.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls are still `powderCoat` and `stainlessSteel`); it passes after the correction (1/1). It checks the three colour controls and their labels, the preset keys, the finish of all ten parts, the flank slope of the base (500 mm at the ground, 220 mm at the deck), the lid height and width on the deck, the end-slope shape, that each anchor head stands above the flank, the triangle count and the overall bounds.
- ESLint is clean. The ev-charging-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 177 files / 247 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its colour controls match the corrected source. The result is in `verification/index-row-check.json`.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, load rating, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
