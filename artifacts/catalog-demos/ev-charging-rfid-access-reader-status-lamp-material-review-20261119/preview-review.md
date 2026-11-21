# Five-preview semantic audit — 19 November 2026 (EV charging site furniture)

## Selection and exclusions

Reviewed the current rendered previews for five ev-charging-infrastructure assets: `rfid-access-reader-pedestal`, `parking-wheel-stop`, `charging-payment-terminal`, `charger-cable-holster-bollard` and `ev-parking-bay-sign`. These source paths are absent from the open catalog PR #1507 diff. No open issue or pull request names them. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `cbfe86f5f`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`rfid-access-reader-pedestal` drew its `status-lamp` with the `powderCoat` control ("Powder-coated metal"), the same finish as the reader housing and the cap. A status lamp is a tinted polymer lens. A user who recolours the housing also recoloured the lamp, and no control could give the lamp a signal colour.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `rfid-access-reader-pedestal` | A stainless post on a floor plate with a teal reader housing, a pale glass window and a flat teal cap read as an access pedestal. Below the reader a dark teal upright stub stands in front of the post. The source confirms it: `status-lamp` is a vertical cylinder in `powderCoat`, centred 60 mm in front of the post face, so it floats 34 mm clear of the post. It does not read as a lamp. | Selected: give the lamp an indicator polymer control and seat it on the post face. |
| `parking-wheel-stop` | A long grey polymer block with a teal top strip, teal end blocks and two steel anchor heads reads as a wheel stop. The top strip and end blocks use `powderCoat` ("Powder-coated metal") on a polymer stop; a real stop has reflective polymer or painted bands. The description says "beveled ends" and "recessed anchor locations"; the ends are square blocks and the anchor heads stand 5 mm proud of the top strip. | Control-label and description limits noted. No change. |
| `charging-payment-terminal` | A stainless column on a base with a hood, a pale screen and a teal keypad block reads as a payment pedestal. `screen-bezel` and `screen-window` both use `displayGlass`, so the screen has no visible frame. The `card-slot` is a proud teal block, not a slot. The `contactless-reader` is an upright polymer cylinder that floats 17 mm in front of the column. | Noted for a later round (same defect class as the selected lamp). No change. |
| `charger-cable-holster-bollard` | A stainless round post on a round foot with a teal cap and a grey polymer box on a short arm reads as a bollard with a holster. The "cable loop" in the description is a 120 mm horizontal stub (`cable-guide`); no cable is drawn. Post, cap and cradle parts use the matching controls. | No material defect. Description limit noted. No change. |
| `ev-parking-bay-sign` | A slim steel post in a teal ground socket with a teal sign panel and an amber face reads as a parking sign. The `top-cap` floats 60 mm above the post top (post ends at 2,720 mm; cap starts at 2,780 mm); the gap is visible. The sign face is blank. | No material defect. Floating cap noted. No change. |

## Correction

Before, `status-lamp` was `cylinder(30, 26, 8)` with a vertical axis at y = -145 mm, z = 620 mm, in `powderCoat` (#397f90). The post front face is at y = -85 mm, so the nearest lamp edge was 34 mm clear of it.

The source now adds an `indicatorPolymer` control ("Indicator polymer", default #48b866) and both presets set it (`fleetReady` #4fc06a, `nightService` #3ddc84). The lamp is the same 30 mm × 52 mm cylinder, turned so its axis runs out of the post face (-Y). Its back face lies on the post face at y = -85 mm; its centre is at z = 640 mm, 34 mm below the reader housing. The lens front (y = -115 mm) stays behind the reader housing front (y = -124 mm).

Part names, the other three colour controls and the two preset names are unchanged. The mesh keeps 104 triangles within the 2,400-triangle budget. The envelope is unchanged (0.36 m × 0.98 m × 0.36 m). The header comment and description no longer say "indicator cap" and "bolted floor plate": the cap is a plain cover and the model has no bolts. The kit README row is updated to match. The data-center kit README row for `emergency-power-off-station` is also updated; the earlier actuator round (49fcb5ad9) left it stale.

Noted, not corrected: the floor plate has no anchor bolts; the preview renderer has no emissive finish, so the lens reads as green paint and not as a lit lamp.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls lack `indicatorPolymer`); it passes after the correction (1/1). It checks the lamp colour, the unchanged finishes of the five other parts, that the lamp axis is horizontal, that the lamp back face lies on the post face, and that the lamp sits below the reader housing and behind its front.
- ESLint is clean. The ev-charging-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 169 files / 239 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row; the row lists the new control.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The green default is a visual modelling choice; it is not taken from a vendor data sheet. The change is not deployed, so no post-deployment page check is claimed.
