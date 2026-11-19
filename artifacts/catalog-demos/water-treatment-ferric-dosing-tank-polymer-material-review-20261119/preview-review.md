# Five-preview semantic audit — 19 November 2026 (water treatment dosing, pipework and controls)

## Selection and exclusions

Reviewed the current rendered previews for five water-treatment assets: `ferric-dosing-tank`, `process-pipe-rack`, `pump-station-control-panel`, `sample-tap-station` and `fine-bubble-diffuser-grid`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The only open pull request that a search returns is the lane PR #1507 itself, for the strings `process-pipe-rack` and `pump-station-control-panel`; its diff does not contain those files. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `4f4b17a27`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`ferric-dosing-tank` drew its `bund`, `tank`, `lid` and `level-column` with the `coatedSteel` control ("Coated equipment steel") and its `vent` and `outlet` with the `stainlessSteel` control ("Stainless steel"). Ferric chloride coagulant corrodes carbon steel and pits stainless steel. A ferric day tank and its bund are normally polyethylene or glass-reinforced plastic, and the pipework is normally PVC. Every colour control on the asset named a metal that the stored chemical attacks.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `ferric-dosing-tank` | A teal twelve-sided tank with a lid and a grey vent on a teal slab. A teal bar stands on the slab away from the tank, and a short grey stub stands upright at the foot of the tank. The source confirms it: the `level-column` box centre is at (170, -220) mm, so its nearest corner is 250 mm from the tank axis, 40 mm outside the 210 mm shell; the `outlet` is an upright cylinder at x = -190 mm, inside the tank wall. | Selected: replace the two steel controls with four plastic controls, seat the sight tube on the shell and turn the outlet into a horizontal stub. |
| `process-pipe-rack` | Four grey rods stand upright between two dark slabs. It does not read as a pipe rack. The source confirms it: the four "parallel process lines" are upright cylinders 1,300 mm tall that start at z = 215 mm; the template cylinder helper has no horizontal form. The two `portal-top` beams use `stainlessSteel`; the legs and brace use `structuralSteel`. | Axis defect and mixed portal finish noted for a later round. No change. |
| `pump-station-control-panel` | A teal box floats above a grey plinth, with a band round its middle and two door slabs that hang below it. The source confirms it: `body` spans z = 475 mm to 1,375 mm, the "rain hood" spans z = 945 mm to 1,005 mm (the body middle, not the top), and the doors span z = 85 mm to 785 mm. The three lamps are upright stubs in `instrumentGlass`; all three share one colour. | Placement defects noted for a later round. No material change. |
| `sample-tap-station` | A teal box floats above a grey base on two short grey stubs, with a band round its middle. A teal stub and a grey tray float in front of it. The source confirms it: `cabinet` spans z = 305 mm to 865 mm and the pipe stubs end at z = 235 mm; `hood` spans z = 605 mm to 650 mm; the `spout` is an upright cylinder in `coatedSteel`, 14 mm in front of the cabinet face; the `drip-tray` stands 50 mm off the cabinet face. | Placement defects and a coated-steel spout noted for a later round. No change. |
| `fine-bubble-diffuser-grid` | Two pale end headers with eight teal laterals between them read as a pipe grid. Seven small green discs sit on the front lateral only. The source confirms it: all seven `diffuser` parts are at y = -350 mm on `lateral-0`; the other seven laterals carry none. The discs have an 18 mm radius. The laterals use `coatedSteel`; real laterals are PVC or stainless steel. | Diffuser layout and lateral material label noted for a later round. No change. |

## Correction

Before, `bund`, `tank`, `lid` and `level-column` used `coatedSteel` (#3d8589) and `vent` and `outlet` used `stainlessSteel` (#b5c0c0). The level column stood 40 mm off the shell. The outlet was an upright cylinder, radius 40 mm, z = 25 mm to 155 mm, with its axis 20 mm inside the shell.

The source now has four colour controls and no steel control:

- `tankPolymer` ("Tank polyethylene", default #e6dfc4): `tank`, `lid`.
- `bundPolymer` ("Bund polyethylene", default #5f7f95): `bund`.
- `pipePvc` ("PVC pipework", default #8b9499): `vent`, `outlet`.
- `sightTube` ("Level sight tube", default #9a5a2a, the rust-brown of the coagulant): `level-column`.

The `weathered` and `highVisibility` presets keep their names and set all four controls. The `level-column` box (45 mm × 35 mm × 360 mm, unchanged) moves to (0, -225) mm, where its back face overlaps the -Y corner of the twelve-sided shell by 2.5 mm. The `outlet` is a horizontal stub, radius 28 mm, from x = -195 mm (inside the shell) to x = -325 mm (the bund edge) at z = 130 mm, 52 mm above the bund floor.

Part names are unchanged. The mesh keeps 360 triangles within the 2,200-triangle budget. The bounds are unchanged (0.65 m × 0.52 m × 0.845 m). The header comment and the description now name the plastic materials. The kit README has no per-asset row for this asset, so it is unchanged.

Noted, not corrected: the removal of `coatedSteel` and `stainlessSteel` changes the control set, so a saved customisation of those controls no longer applies. The bund is a flat slab with no containment walls. The sight tube is a square bar, not a round tube with end fittings, and it shows one solid colour, not a liquid level. The tank has no fill connection, manway or label. The asset still uses the kit template cylinder helper. `docs/benchmarks/token-efficiency/sample-manifest.json` holds a frozen hash of an older revision of this source; it was already different from the pre-fix source and is not updated.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls are `coatedSteel` and `stainlessSteel`); it passes after the correction (1/1). It checks the four part colours, that the sight tube touches the shell and stays outside it, that the outlet is horizontal, clears the bund floor, leaves the shell and stays inside the bund outline, and the overall bounds.
- ESLint is clean. The water-treatment kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 172 files / 242 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row; the row lists the four plastic controls and no steel control.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance, chemical-compatibility certification or hardware acceptance. The default colours are plausible values chosen for the model; they are not taken from a supplier data sheet. The change is not deployed, so no post-deployment page check is claimed.
