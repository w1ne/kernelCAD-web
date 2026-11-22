# Five-preview data-center semantic audit — 2026-11-16

Five industrial previews from `data-center-infrastructure` were selected. None of them is named by an open issue or by a PR other than the lane PR #1406 (`verification/open-target-searches.md`). All five checked-in default previews were opened and inspected. The contact sheet is `preview-review-five-assets.png`; baseline images and hashes are in `samples/` and `verification/screened-preview-sha256.txt`.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `data-center-infrastructure/day-fuel-tank` | Vertical tank, fill neck, level gauge and drain valve on a flat base. The support skid used the `polymer` knob ("Engineering polymer", #c99b35) and rendered yellow. Generator day tanks stand on welded structural steel skids. | **Material mismatch fixed** (follow-up recorded on 2026-11-15): skid now uses a new `skidSteel` knob ("Skid base steel", #3d4449). |
| `data-center-infrastructure/liquid-cooling-manifold` | Supply and return headers with five branch drops and valves. The left support base is yellow (`polymer`); the identical right support base is painted steel. | Mismatch found (asymmetric material on a mirrored pair). **Not fixed this round.** Follow-up. Supports also do not touch the headers (geometry note). |
| `data-center-infrastructure/overhead-coolant-header` | Two mains, branch drops and pipe clamps. The left hanger is yellow (`polymer`); the identical right hanger is painted steel. | Same asymmetric mismatch. **Not fixed this round.** Follow-up. Hangers sit below the mains instead of above them (geometry note). |
| `data-center-infrastructure/in-row-cooler` | Tall cabinet with front louvres, two top fans and a thin yellow base plinth (`polymer`). | Plinth is a probable steel part; the visible band is small. Lower priority follow-up. |
| `data-center-infrastructure/data-center-plate-heat-exchanger` | Steel skid, fixed and pressure frames, plate pack, front inlet flange. The rear `outlet-flange` uses `polymer` but is hidden in the preview. | Hidden mismatch in source; not visible in the preview. Follow-up. |

## Correction and verification

Only the support-skid material changed. The `polymer` knob had no other user in this asset, so it was renamed to `skidSteel` with a steel default. Both presets carry the new key (`facilityStandard` #3d4449; `highVisibility` keeps its previous dark value #263e48). Geometry, dimensions, asset ID and triangle count (200 / 2,200 budget) are unchanged.

The regression checks the knob list, checks that the exported `support-skid` color is #3d4449, and checks that `reservoir`, `fill-neck` and `level-gauge` keep painted steel #4f7485. `verification/test-before.txt` shows the failure on the uncorrected source.

Out of scope and not changed: the `access-platform` slab is a thin plate over the tank top rather than a railed platform.
