# Five-preview semantic audit — 19 November 2026 (water treatment mix tanks and valves)

## Selection and exclusions

Reviewed the current rendered previews for five water-treatment assets: `knife-gate-valve-assembly`, `check-valve-assembly`, `lime-slurry-tank`, `coagulant-mixing-tank` and `flocculation-tank`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The only open pull request that a search returns is the lane PR #1507 itself, for the string `check-valve-assembly`; its diff does not contain that file. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `eec7fc320`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`knife-gate-valve-assembly` drew its `stem` with the `coatedSteel` control ("Coated equipment steel"), the same painted finish as the body and bonnet. The description calls it a rising stem. A rising stem slides through the packing gland each time the valve moves, so it is a bare machined stainless bar; paint on it does not survive and damages the packing. The asset already had a `stainlessSteel` control, used by the two pipe stubs.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `knife-gate-valve-assembly` | A teal cube on a grey foot with a teal bonnet, a teal stem and an amber handwheel. Two grey drums stand upright beside the cube; they do not read as a pipe run. The source confirms it: `stem` uses `coatedSteel`; `pipe-left` and `pipe-right` are upright cylinders, 130 mm tall and 100 mm in radius, at y = ±220 mm; `gate-body` starts at z = 65 mm and `mount-foot` ends at z = 45 mm. | Selected: move the stem to the stainless control, lay both pipe stubs on the pipe run axis and stand the body on the foot. |
| `check-valve-assembly` | An upright teal spool between two grey flanges. A teal plate, a stub and a block sit on the top flange face. The source confirms it: the `cover` plate (180 mm × 170 mm) lies on the face of `flange-right`, where the next pipe connects; `hinge` is an upright cylinder on the valve axis; `inspection-bolt` is an 80 mm block. The body is painted and the flanges are stainless, though a check valve body and its flanges are one casting. | Cover placement and mixed body/flange finish noted for a later round. No change. |
| `lime-slurry-tank` | A closed teal drum with a rim. A grey shaft stands on its top with two teal bars and a teal block in the air above the tank. The source confirms it: the description says "open mix tank", but `tank` and `rim` are solid; `paddle-a` and `paddle-b` are at z = 740 mm and 850 mm, above the rim top at 585 mm; `motor` rests on the shaft end with no bridge. The `outlet` is a block on the +Y side, away from the preview camera. Painted steel is a plausible material for a lime slurry tank. | Closed top and paddles above the tank noted for a later round. No material change. |
| `coagulant-mixing-tank` | A closed teal drum with a rim. A grey shaft with a grey crossbar and a teal block stands above it; a small grey stub stands upright on the tank wall. The source confirms it: both `impeller` bars are at z = 820 mm, above the rim top at 680 mm; `inlet` is an upright cylinder, 100 mm tall, at y = -350 mm. The stainless shaft and impeller are consistent with each other. | Impeller above the tank and upright inlet stub noted for a later round. No material change. |
| `flocculation-tank` | A closed teal drum with a rim. A teal bar with two teal end blocks lies on its top; a grey shaft and a teal block stand above. The source confirms it: the description names "three paddle arms"; the model has two arms and two paddles. `paddle-a` and `paddle-b` span z = 480 mm to 660 mm, half sunk in the solid top (rim top at 520 mm). | Closed top and paddle count noted for a later round. No material change. |

## Correction

Before, `stem` used `coatedSteel` (#3d8589). `pipe-left` and `pipe-right` were upright cylinders (z = 135 mm to 265 mm) at y = ±220 mm. `gate-body` spanned z = 65 mm to 305 mm, 20 mm above the 45 mm mount foot.

The source keeps its four colour controls (`coatedSteel`, `structuralSteel`, `stainlessSteel`, `warningAmber`) and both presets:

- `stem` uses `stainlessSteel` (default #b5c0c0). Its geometry is unchanged.
- `pipe-left` and `pipe-right` are horizontal stubs, radius 100 mm and 180 mm long. Each starts 10 mm inside its body face (y = ±140 mm) and ends at y = ±320 mm. The stub axis is at z = 175 mm, the body mid-height; the stubs clear the mount foot by 30 mm.
- `gate-body` spans z = 45 mm to 305 mm, so it stands on the mount foot. Its top face is unchanged.

Part names are unchanged. The mesh keeps 356 triangles within the 2,200-triangle budget. The bounds are unchanged (0.38 m × 0.64 m × 0.685 m). The header comment and the description now name the stainless stem and the pipe stubs. The kit README has no per-asset row for this asset, so it is unchanged.

Noted, not corrected: the model shows no gate blade, yoke or packing gland, so only the title identifies it as a knife gate valve and not a generic gate valve. The body is a 300 mm cube; a real knife gate body is a thin wafer between the flanges. The pipe stubs have no flange discs or bolts. The handwheel is a solid disc. The asset still uses the kit template cylinder helper.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the stem uses the coated finish); it passes after the correction (1/1). It checks the finish of all seven parts, that the body stands on the foot, that each pipe stub shows its 200 mm diameter in height and runs 180 mm along the pipe axis at the body mid-height, that each stub starts at its body face and leaves it, and the overall bounds.
- ESLint is clean. The water-treatment kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 173 files / 243 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, bounds and colour controls match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
