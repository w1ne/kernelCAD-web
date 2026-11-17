# Five-preview data-center semantic audit — 2026-11-15

Five industrial previews from `data-center-infrastructure` were selected. No open issue or PR targets them (`verification/open-target-searches.md`). All five checked-in default previews were opened and inspected. The contact sheet is `preview-review-five-assets.png`; baseline images and hashes are in `samples/` and `verification/screened-preview-sha256.txt`.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `data-center-infrastructure/condenser-pump-skid` | Two blue motor/pump sets, suction and discharge headers on a flat base. The base frame used the `polymer` knob ("Engineering polymer", #c99b35) and rendered yellow. Pump skids are built on fabricated structural steel bases. | **Material mismatch fixed:** base now uses a new `skidSteel` knob ("Skid base steel", #3d4449). |
| `data-center-infrastructure/day-fuel-tank` | Cylindrical tank with fill neck, level gauge and drain on a yellow support skid. The skid uses the same `polymer` knob. | Same mismatch found. **Not fixed this round** (one fix per round). Follow-up candidate. |
| `data-center-infrastructure/standby-generator-enclosure` | Grey enclosure with louvred doors, control panel, E-stop, dark base tank, silencer and exhaust stack. | No material mismatch found. |
| `data-center-infrastructure/coolant-distribution-unit` | Plain blue cabinet with door line and plinth. Reads as a generic cabinet; no visible pipe connections. | No material mismatch found. Silhouette is weak (geometry issue, out of scope for a material round). |
| `data-center-infrastructure/dry-type-transformer` | Three cast-resin coils, grey clamping frame, copper bus bars, porcelain bushings, castor wheels. | No material mismatch found. |

## Correction and verification

Only the base-skid material changed. The `polymer` knob had no other user in this asset, so it was renamed to `skidSteel` with a steel default. Both presets carry the new key (`facilityStandard` #3d4449; `highVisibility` keeps its previous dark value #263e48). Geometry, dimensions, asset ID and triangle count (300 / 2,200 budget) are unchanged.

The regression checks the knob list, checks that the exported `base-skid` color is #3d4449, and checks that `motor-0`, `pump-body-0` and `discharge-header` keep painted steel #4f7485. `verification/test-before.txt` shows the failure on the uncorrected source.
