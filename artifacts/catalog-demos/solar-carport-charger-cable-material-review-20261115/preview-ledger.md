# Preview ledger — 2026-11-15 (solar carport charger cable and four yard/site machines)

Lane PR #1406 was open and mergeable at round start (head `6d6276164`). All completed CI checks had passed; `catalog-index`, `test-shard (3)` and `build-and-checks` were still running. The only open PR that touches `catalog/kits/` (#1253) changes `city-street/mailbox`. No open issue names the assets below. None of the five is named in a ledger under `artifacts/catalog-demos/`.

Selection: a source scan matched part names that imply a non-metal material (tyre, hose, cable, belt, seat, curtain, pallet, lens and similar) against a colour control whose key or label names steel, paint or metal. The scan read both `p.part(...)` and `add(...)` helpers and skipped the 276 assets already named in an earlier ledger. It returned 671 part hits; most are correct (clamps, cabinets, mesh, treads, lamp masts, steel riding tyres). The five assets below are industrial/site equipment where the hit names a visible part. The checked-in default preview of each one was opened (`samples/`, `previews/before/`). The tug cart was also opened in `kernelcad render inspect` front view.

| Asset | Triangles / budget | Source SHA-256 | Preview SHA-256 | Observation |
|---|---:|---|---|---|
| `solar-energy/solar-carport-canopy` | 1,504 / 1,800 | `ffb6db0a815574936decf20af37719c759b3542bd61bd0f34561d30ceb96848c` | `e9c87cce9535d7e3315c352c3479e530d98bc8dcb4de44d6367071eaf5844327` | **Material defect, corrected (see below).** The three `ev-charger-cable-*` parts (the charging lead that hangs in a loop from the charger to the holster) use `galvanizedSteel` (`#748184`). The loop has the same grey as the steel column behind it and reads as a bent metal bar. |
| `shipyard/yard-material-tug-cart` | 372 / 1,800 | `0843e69eafd258a7b2c0980e7e6ff0627f19becc49130af58efef51ed8ff56af` | `6ccd17c09f5465b3dd78c5d10be86cdc46442524b095d34fd9811745ae56ce5b` | Source mismatch: `seat` uses `yardPaint` (body brown), so it merges with the body. Not changed: the inspect front view shows the seat floating about 180 mm above `operator-floor` (seat z 830–1010 mm, floor top 650 mm) and the `overhead-guard` floating with no posts. A seat colour alone would give a black floating box; the fix needs geometry first. |
| `shipyard/hull-block-paint-booth` | 336 / 1,800 | `e24b90434125443ef4f7bb044e35e735721e948fcd4d3e962f280ff25b0e91d7` | `1e4b76bc691c44b4906d9db2815b6885f3d24833f840a389157e56b5e8760b42` | Possible mismatch, not changed: both `side-curtain-*` parts use `yardPaint` ("Yard finish"), and the 90 mm slabs read as painted steel walls. Booth curtains are PVC or fire-retardant tarpaulin, which can be dark green, so the colour alone is not wrong. The booth also has no roof cladding and the plenum floats on the joists. |
| `construction-equipment/mast-climbing-work-platform` | 3,124 / 6,000 | `9493768933fea5c2aa5347b38482417041865c0d12c8e3b6eca9f415355938b4` | `28bc905fddfa7f693f112944e9677992379681c896bb2789a454863b29b38fc2` | Reads correctly: lattice masts, blue chassis bases with yellow outrigger pads, yellow guardrail, brick pallet and a mortar tub on the deck. The scan hit (`pallet` in `deckPaint`) is the pallet under the bricks; it is small and partly hidden. No defect found. |
| `mining/underground-shuttle-car` | 2,428 / 3,000 | `e0af303de595dd93e059712ecd635ae0d13a48b31f9c6bb8aae5e4d8e74eeaa0` | `7a3eb0ff7c56468437d55ea8ef6ffef307f81c47c4b168dde0df65cd6e83045e` | Reads correctly: low yellow body, cab, black trailing cable to the rear. The scan hit (`cable-reel-drum` in `chassisSteel`) is a steel reel drum, which is correct. No defect found. |

## Correction: solar carport charging cable

An EV charging cable is a flexible lead with a polymer jacket (TPE or PUR, usually black). It is not galvanized structural steel. In this asset `galvanizedSteel` also colours the columns, girders, purlins, braces and the holster, so the control stays and the cable gets its own.

- New control `chargerCable` ("EV charging cable jacket", `#202427`) on the three `ev-charger-cable-*` parts. A source comment says why.
- `fieldService` preset: `chargerCable: '#262b2e'`. `highVisibility` preset: `chargerCable: '#1b1e20'`. The other preset values are unchanged.
- The meta description lists the new control.
- `galvanizedSteel` stays on the columns, girders, purlins, braces and `ev-charger-holster`. `chargerPlastic` stays on the charger housing.
- Geometry, part names and the triangle count (1,504) are unchanged. All existing parameter keys are kept. `python3 scripts/checkCatalogQuality.py --kit solar-energy`: 40/40 pass. `scripts/checkCatalogAsset.ts`: minUpM 0, 1,504 / 1,800 triangles.

Regression: `tests/integration/catalog/solarCarportChargerCableMaterial.test.ts` reads the exported GLB colours. It fails on the baseline source (the colour controls end at `chargerPlastic`; see `verification/test-before.txt`) and passes after the fix. It also checks both presets, that `column-right-rear`, `girder-left` and `ev-charger-holster` keep `galvanizedSteel`, and that the housing keeps `chargerPlastic`.

Source SHA-256 after: `373f81bb12a451d7f6f4e299478479b178c401c226c6196a86e2f7a932f39274`. Preview SHA-256 after: `94157074bc8d07da91c0c4a9c13fa24888d510b906474f84c88329b73f530bd1`.

### Evidence

- Default catalog preview, before and after: `previews/{before,after}/solar-carport-canopy.png`. 145 pixels differ (difference > 8 on any channel), all inside the box x 394-404, y 264-290, which is the cable loop. The visible gain at catalog size is small: the loop changes from column grey to black and separates from the column. `previews/{before,after}/charger-crop.png` are 8x nearest-neighbour crops of that area.
- Inspection views from `npx kernelcad render inspect <source> <out>`: full model `previews/{before,after}/inspect-iso.png`; charger parts only (`--focus ev-charger-*`) `previews/{before,after}/inspect-charger-iso.png`. Both before and after views carry a `MECHANISM BROKEN · mechanism.interpenetration` badge. It is present in the before views too, so this change did not cause it.
- Review MP4 (21 s): `charger-cable-review.mp4`, built by `make_demo.sh`. Two decoded frames (before crop at 5 s, after crop at 16 s) were opened and read correctly.
- The other four default previews: `samples/`.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview.

## Defects noted but not changed in this round

- `yard-material-tug-cart`: seat in body paint, floating 180 mm above the floor; overhead guard has no posts.
- `hull-block-paint-booth`: curtains are 90 mm painted slabs; no roof cladding; plenum floats.
- `solar-carport-canopy`: `ev-charger-holster` is in `galvanizedSteel` (holsters are usually moulded plastic); it is a small block in the preview. Not changed.
- Carried over from earlier 2026-11-15 ledgers: `yard-cable-reel-cart` log-like cable drum; `ultrasonic-test-cart` case-green cable spool; `reverse-osmosis-skid` steel-coloured lamps and display; `aircraft-fuel-truck` and `lavatory-service-truck` floating hoses; `postal-label-printer` floating label roll; `scba-cylinder-fill-bank` has no cylinders.
