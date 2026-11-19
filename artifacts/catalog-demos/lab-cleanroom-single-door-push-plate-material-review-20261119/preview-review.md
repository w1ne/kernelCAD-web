# Five-preview semantic audit — 19 November 2026 (laboratory infrastructure doors and wall services)

## Selection and exclusions

Reviewed the current rendered previews for five lab-infrastructure assets: `cleanroom-single-door-module`, `cold-room-door-module`, `laboratory-wall-eyewash-station`, `laboratory-water-service-console` and `cleanroom-pass-through-chamber`. These source paths are absent from the open catalog PR #1507 diff. No open issue or pull request names them. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `ae1567d11`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`cleanroom-single-door-module` drew its `door-push-plate` with the `enamel` control ("Enamel coating"), the same finish as the door leaf. A door push plate is a stainless steel sheet. In the preview the plate was a thin sliver in the leaf colour, and no control could give it a metal finish.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `cleanroom-single-door-module` | Two dark steel posts, a pale enamel header and a pale leaf with a teal vision panel read as a doorway. On the latch side a thin vertical sliver in the leaf colour is the only hardware. The source confirms it: `door-push-plate` is a 40 mm × 170 mm bar, 12 mm thick, in `enamel`; its back face is at y = -56.4 mm and the leaf face is at y = -53.4 mm, so it floats 3 mm off the leaf. | Selected: give the plate a stainless control, a plate shape, and seat it on the leaf. |
| `cold-room-door-module` | Reads as the same doorway with thicker posts. The push plate has the same defect (enamel sliver, 3 mm off the leaf). The description names an "exterior pull" and a "protective kick plate"; the model has neither. The presets are named for a cleanroom. | Noted for a later round. No change. |
| `laboratory-wall-eyewash-station` | A wall plate with a grey shelf, two dark posts with amber heads and an amber bar. The amber push bar and heads are plausible polymer parts. The stainless `basin-rim` slab covers the enamel `basin`, so the bowl reads as a flat shelf. The spray heads stand 230 mm above the bowl on steel posts; real heads sit just above the bowl. | No material defect. Shape limits noted. No change. |
| `laboratory-water-service-console` | A splash panel on a dark base with two stainless risers, amber handles and short spouts reads as a tap console. The spouts run along X, parallel to the splash panel; they do not reach out over a sink. Risers and spouts use `stainless`; handles use `polymer`. | No material defect. Spout direction noted. No change. |
| `cleanroom-pass-through-chamber` | A pale box on a dark plinth with a dark slab across the top. The two access doors stand as slabs that rise above the box: the doors span z = 360 mm to 936 mm and the chamber ends at z = 650 mm. The upper `mount-frame` lies on top of the chamber at z = 664 mm and cuts through the doors. Handles use `polymer`; windows use `glass`. | No material defect. Door and frame placement defect noted for a later round. No change. |

## Correction

Before, `door-push-plate` was `box(40, 12, 170)` at x = 273 mm, y = -62.4 mm, z = 1,165 mm, in `enamel` (#c9dedc).

The source now adds a `stainless` control ("Stainless steel", default #b8c7ca, the value the other lab-infrastructure assets use) and both presets set it (`cleanroom` #d0d9d8, `highVisibility` #6f8488). The plate is a 100 mm × 300 mm sheet, 4 mm thick, at the same x and z. Its back face lies on the leaf front face at y = -53.4 mm. It stays 80 mm inside the leaf edge.

Part names, the other three colour controls and the two preset names are unchanged. The mesh keeps 72 triangles within the 1,800-triangle budget. Width and height are unchanged (1.30 m × 2.48 m). Depth changes from 128.4 mm to 126.6 mm: the old plate was the most forward part, and the vision panel now is. The header comment and the description now name the vision panel and the push plate. The kit README row is updated to match.

Noted, not corrected: the door has no hinges, closer or seal. Stainless on pale enamel is a low-contrast pair in the default palette: the plate is visible in the preview but not prominent. The `highVisibility` preset gives more contrast.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls lack `stainless`); it passes after the correction (1/1). It checks the plate colour, the unchanged finishes of the five other parts, the plate size (100 mm × 300 mm × 4 mm), that the plate back face lies on the leaf face, and that the plate stays inside the leaf outline at hand height.
- ESLint is clean. The lab-infrastructure kit quality gate passes 60/60 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 170 files / 240 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, width and height match the before row; the row lists the new control.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The plate size is a typical push-plate size chosen for the model; it is not taken from a vendor data sheet. The change is not deployed, so no post-deployment page check is claimed.
