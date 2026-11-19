# Five-preview semantic audit — 19 November 2026 (water treatment valves, spools and gate hoist)

## Selection and exclusions

Reviewed the current rendered previews for five water-treatment assets: `pressure-reducing-valve-assembly`, `air-release-valve-assembly`, `static-mixer-spool`, `flow-meter-spool` and `intake-gate-hoist`. These source paths are absent from the open catalog PR #1507 diff. No open issue or open pull request names them. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `e4b81bb94`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`pressure-reducing-valve-assembly` drew its `stem` with the `coatedSteel` control ("Coated equipment steel"), the same painted finish as the body, bonnet and actuator. The stem carries the handwheel and turns through the actuator cover to set the outlet pressure, so it is a bare machined stainless bar; paint on it does not survive. The asset already had a `stainlessSteel` control, used by the two pipe flanges.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `pressure-reducing-valve-assembly` | An upright teal drum between a grey disc on the ground and a grey disc on top; a teal bonnet, a teal block, a teal stem and an amber handwheel stand on the top disc. It reads as a pedestal, not as a valve in a pipe run. The source confirms it: `stem` uses `coatedSteel`; `flange-left` (z = 0 mm to 40 mm) and `flange-right` (z = 300 mm to 340 mm) are stacked on the vertical axis, so the pipe axis is vertical; `bonnet` starts at z = 300 mm, inside the `flange-right` disc, where the next pipe connects. | Selected: move the stem to the stainless control and lay the body and both flanges on the pipe run axis. |
| `air-release-valve-assembly` | A teal canister on a grey base flange with a wider teal bonnet and cap. A grey stub stands upright against the bonnet and an amber tag plate projects from the body. The source confirms it: the description names a "side vent port", but `vent` is an upright cylinder, 110 mm tall, at y = -130 mm. A coated body with a stainless vent is a plausible material set. | Upright vent stub noted for a later round. No material change. |
| `static-mixer-spool` | An upright grey pipe that stands on one flange, with a teal box and a small teal plate at mid-height. The source confirms it: the pipe axis is vertical; `mixer-housing` is a 220 mm × 220 mm × 170 mm box around a pipe 200 mm in diameter. A static mixer has its elements inside the pipe; the box and the "access cover" do not identify it. The stainless pipe and flanges are consistent with each other. | Vertical layout and box housing noted for a later round. No material change. |
| `flow-meter-spool` | A plain grey pipe that stands on one flange. No sensor or transmitter shows, and no part uses the teal control. The source confirms it: `sensor-boss` (radius 50 mm) and `transmitter` (180 mm × 130 mm) are on the pipe axis at z = 390 mm to 650 mm, inside the `spool` (radius 115 mm, z = 0 mm to 780 mm). The `coatedSteel` control has no visible effect. | Hidden sensor boss and transmitter noted for a later round. This is a placement defect, not a material mismatch. No change. |
| `intake-gate-hoist` | A portal frame with teal uprights, a grey beam and grey base feet. A teal drum hangs under the beam; a thin grey bar hangs from it and ends above a grey gate plate. The source confirms it: `drum` is an upright cylinder, so its axis is vertical, not horizontal; `chain` ends at z = 550 mm and `gate-plate` tops out at z = 500 mm, a 50 mm gap. Stainless is a plausible material for the gate plate and chain. | Drum axis and chain gap noted for a later round. No material change. |

## Correction

Before, `stem` used `coatedSteel` (#3d8589). `body` was an upright cylinder (z = 40 mm to 300 mm) between `flange-left` on the ground and `flange-right` on top. `bonnet` spanned z = 300 mm to 450 mm.

The source keeps its three colour controls (`coatedSteel`, `stainlessSteel`, `warningAmber`) and both presets:

- `stem` uses `stainlessSteel` (default #b5c0c0). Its geometry is unchanged.
- `body` lies on the X axis, x = -130 mm to 130 mm, radius 150 mm, with its axis at z = 190 mm.
- `flange-left` (x = -170 mm to -130 mm) and `flange-right` (x = 130 mm to 170 mm) are discs of radius 190 mm on the same axis. Their rims rest on the ground.
- `bonnet` spans z = 320 mm to 450 mm. It starts 20 mm inside the top of the body, at mid-length. It is 20 mm shorter than before, so the actuator, stem and handwheel keep their heights.

Part names are unchanged. The mesh keeps 532 triangles within the 2,200-triangle budget. The bounds change from 0.38 m × 0.38 m × 0.735 m to 0.34 m × 0.38 m × 0.735 m (length on the pipe axis × width × height). The header comment and the description now name the horizontal body and the stainless adjusting stem. The kit README has no per-asset row for this asset, so it is unchanged.

Compatibility note: the control names, defaults and presets are unchanged. A scene that placed this asset as a vertical pedestal now gets a valve that lies on the X axis, 40 mm shorter in X.

Noted, not corrected: the model shows no pilot tubing, pressure gauges or flange bolts, so the title and the actuator block are what identify it as a pressure reducing valve and not a generic globe valve. The handwheel is a solid disc. The valve has no support; it rests on its flange rims. The asset still uses the kit template cylinder helper.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the stem uses the coated finish); it passes after the correction (1/1). It checks the finish of all seven parts, that the body runs 260 mm along the pipe axis, that each flange is a 40 mm disc on edge that closes its body end and rests on the ground, that the bonnet starts in the top of the body at mid-length, that the actuator, stem and handwheel stack without gaps, and the overall bounds.
- ESLint is clean. The water-treatment kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 174 files / 244 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and colour controls match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
