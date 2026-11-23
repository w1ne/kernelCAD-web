# Five-preview semantic audit — 19 November 2026 (recycling-facility site equipment)

## Selection and exclusions

Reviewed the current rendered previews for five recycling-facility assets: `vehicle-barrier-gate`, `tyre-dropoff-rack`, `truck-wheel-wash`, `roller-conveyor-section` and `walking-floor-trailer`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. One open-PR search hit (`roller-conveyor-section`) is PR #1507 itself, which names a bottling-line conveyor, not this asset. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `49fcb5ad9`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: no material mismatch; one placement defect corrected

None of the five previews shows a part with the wrong material or colour control. The brief for this round asks for one material mismatch. This round did not find one in the five assets and does not claim one. It corrects a physical-feature defect on `vehicle-barrier-gate` instead.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `vehicle-barrier-gate` | An orange drive cabinet with a beacon, a red and white boom with a rubber edge and a fork rest post read as an arm barrier. Two orange posts with black heads stand under the boom span, 0.87 m from the cabinet plinth and 0.6 m either side of the boom. The source confirms it: both `eye-post` parts sit at x = 1,130 mm, inside the 3.64 m drive lane, and the lenses face each other along the direction of travel. A vehicle that passes the open barrier drives over them. The header comment and description say "photo-eye pair either side of the lane". | Selected: move the pair to the lane edges and turn the lenses to look across the lane. |
| `tyre-dropoff-rack` | A galvanised two-tier frame with eight upright tyres (four on rims), a sign board, two yellow guard posts and a stack of flat tyres read as a tyre rack. The `pallet` is a solid brown slab; its three skids sit inside the slab and do not show. Tyre, rim, frame and guard parts use the matching controls. | No material defect. Pallet shape limit noted. No change. |
| `truck-wheel-wash` | A grated deck with two ramps, side walls with orange spray bars and jets, a blue settlement tank on legs and a control panel on a post read as a wheel wash. The pump set is behind the tank and is not visible. `pump-motor` uses the `tank` control ("Settlement tank (painted steel)"), so a tank recolour also recolours the motor. | Minor control-mapping limit noted. Not visible in the preview. No change. |
| `roller-conveyor-section` | Blue channel frames, steel rollers, a yellow chain guard with slots, flared entry guides, a drive motor, a stop beam with pads and a strapped cardboard bale read as a bale roller conveyor. The feet use the `bumper` control; its label says "Bumper and feet (rubber)". | No defect. No change. |
| `walking-floor-trailer` | Tall sides with stakes, cross bows, a rolled green tarp at the front, a slatted floor with a woodchip load, a tri-axle bogie, landing legs and a rear under-run bar with lights read as a walking-floor trailer. The outer side faces are in shade and render mid grey although the `body` default is light aluminium (#dfe3e6). The swung-back rear doors do not read as doors against the sides. | No material defect. Render shade and door legibility limits noted. No change. |

## Correction

Before, a loop placed both photo-eyes at x = `BX + 900` (1,130 mm from the cabinet centre) and y = ±600 mm, with lenses turned to ±Y. The lane runs along Y, so the posts stood in the roadway and the beam ran parallel to travel.

The source now places `eye-post-0` at x = 420 mm, 160 mm clear of the cabinet plinth, and `eye-post-1` at x = 4,030 mm, in line with the rest post. Both stand at y = -300 mm, on the road side of the boom. The lenses turn to +X and -X and face each other across the lane. The beam is 3.61 m long, 700 mm above ground, and crosses the lane 0.3 m ahead of the boom.

Part names, the four colour controls (`cabinet`, `boom`, `stripes`, `beacon`) and the three presets are unchanged. The mesh keeps 1,050 triangles within the 2,400-triangle budget. Width and height are unchanged (4.52 m × 1.266 m). Depth changes from 1.31 m to 0.595 m because the posts no longer stand 0.6 m either side of the boom.

Noted, not corrected: the far photo-eye post stays in place when the optional rest post is off; the lens colour (#d23a2a) is fixed and has no control.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (depth 1.31 m, expected 0.595 m); it passes after the correction (1/1). It checks that no photo-eye post stands in the clear lane between the plinth and the rest-post foot, that both posts are on one line across the lane 0.3 m from the boom, that the heads are clear of the boom and the rest-post foot, and that each 10 mm lens sits on the head face that looks at the other head.
- ESLint is clean. The recycling-facility kit quality gate passes 153/153 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 168 files / 238 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, width and height match the before row, and its depth is the expected 0.595 m.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, safety function, standards compliance or hardware acceptance. The photo-eye position is a visual modelling choice; it is not taken from a vendor installation drawing. The change is not deployed, so no post-deployment page check is claimed.
