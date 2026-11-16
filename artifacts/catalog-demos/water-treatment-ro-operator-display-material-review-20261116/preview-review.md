# Five-preview semantic audit — 2026-11-16

Five industrial previews were selected: three water-treatment assets that no earlier review bundle covers in full, and two carried-over follow-ups from the 2026-11-15 and 2026-11-16 ledgers. No open issue or PR other than the lane PR #1406 targets them (`verification/open-target-searches.md`). All five checked-in default previews were opened and inspected. The contact sheet is `preview-review-five-assets.png`; baseline images and hashes are in `samples/` and `verification/screened-preview-sha256.txt`.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `water-treatment/reverse-osmosis-skid` | FRP membrane vessels, stainless manifolds, feed pump and a control cabinet with a stainless door. The `operator-display` used `structuralSteel` (#68777b) and rendered as a grey steel plate on the door. | **Material mismatch fixed**: display now uses a new `displayGlass` knob ("Operator display glass", #1f2d36). |
| `water-treatment/chlorine-residual-analyzer` | Cabinet and head on a post and base. The `display` part (`instrumentGlass`) is inside the cabinet volume (cabinet front y = -130 mm, display y = -129 to -111 mm), so it is not visible. The cabinet and head boxes also overlap in Z. | Geometry defect, not a material defect. Follow-up. |
| `water-treatment/chemical-storage-tank` | Vertical tank on a containment ring, roof, hatch and level strip. The whole tank uses `coatedSteel`. Many dosing-chemical tanks are HDPE or FRP, but coated-steel tanks also exist. | Possible but ambiguous mismatch. Not changed. |
| `shipyard/ultrasonic-test-cart` | Wheeled cart, instrument case, probe holders and a side cable spool. Case, spool and holders all use `yardPaint`; the spool reads as part of the case. | Carried-over follow-up; needs a cable-jacket colour and spool shape. Not fixed this round. |
| `data-center-infrastructure/liquid-cooling-manifold` | Left support base is yellow `polymer`; mirrored right base is steel. The two headers run along Y (`alongAxis([0,1,0])`) while the drops, valves and supports are spaced along X, so the headers do not meet the drops or the supports. | Material fix alone is not useful: the header orientation must be fixed first. Follow-up. |

## Correction and verification

Only the operator-display material changed. A new `displayGlass` knob was added (the `structuralSteel` knob still drives the frame, rails and supports). Both presets carry the new key (`weathered` #2a3337, `highVisibility` #14262f). Geometry, dimensions, asset ID and triangle count (2,660 / 3,300 budget) are unchanged.

The extended regression checks the colour-knob list and preset keys, checks that the exported `operator-display` colour is #1f2d36, and checks that `cabinet-door` keeps stainless steel #b5c0c0. `verification/test-before.txt` shows the failure on the uncorrected source.

Out of scope and not changed: `status-lamp-green` uses `stainlessSteel` and `status-lamp-red` uses `coatedSteel`, so neither lamp shows its named colour. The lamps are 24 mm across and barely visible in the preview.
