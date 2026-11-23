# Five-preview semantic audit — 19 November 2026 (wind energy tower and site hardware)

## Selection and exclusions

Reviewed the current rendered previews for five wind-energy assets: `tower-section`, `wind-farm-meter-pedestal`, `aviation-light`, `turbine-door-frame` and `foundation-anchor-cage`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The only open pull request that a search returns is the lane PR #1507 itself, for the string `tower-section`; its diff does not contain the file. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `56f300afe`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`tower-section` drew its `shaft`, `lower-collar` and `upper-band` with the `stainlessSteel` control ("Stainless steel"). A wind turbine tower shell is rolled carbon steel plate with a paint coating; it is not stainless steel. The description said "steel tower segment" and the only "Painted steel" part was the small access panel. The title said "Tapered", but the shaft was a straight cylinder.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `tower-section` | A straight grey column on a wider collar with a narrow top band and a dark panel on the side. It reads as a post, not as a tapered tower can. The source confirms it: `shaft` is `cylinder(1700, 130, 12)` in `stainlessSteel`; base and top radius are equal. | Selected: give the shell a tower paint control, give the flanges a flange steel control, and taper the shell. |
| `wind-farm-meter-pedestal` | A teal cabinet head on a post with a footplate reads as a pedestal. The amber `screen` is plausible. The `light` is a small amber cylinder that hangs in the air below and in front of the head: it spans z = 695 mm to 727 mm, the head starts at z = 745 mm, and its centre is 20 mm in front of the head face. It shares the `polycarbonate` control with the screen. | Placement defect and shared lamp/screen control noted for a later round. No change. |
| `aviation-light` | A square base, a short stem, an amber lamp body and a dark cap read as a beacon. The lamp uses `polycarbonate`; mount, stem and cap use `powderCoatedSteel`. The default lens is amber; obstruction lights are usually red or white, but the control lets the user set that. | No material defect. Default lens colour noted. No change. |
| `turbine-door-frame` | Two jambs, a header, a threshold plate and a door leaf with a small handle read as a door frame. All frame parts and the leaf use `galvanizedSteel`; the handle uses `stainlessSteel`. A gap shows between the leaf top (z = 1,630 mm) and the header (z = 1,730 mm). A real tower door is an oval in a curved wall; this is a flat rectangular frame. | No material defect. Shape limits noted. No change. |
| `foundation-anchor-cage` | A flat ring with eight upright bolts round a dark central drum. The `ring` and bolts use `stainlessSteel`; real anchor bolts and load rings are carbon steel, often with a coating. The dark `socket` drum is 300 mm tall and stands above the bolts (240 mm); a real anchor cage has no central drum and has many more bolts. | Material label and shape limits noted for a later round. No change. |

## Correction

Before, `shaft` was a straight twelve-sided cylinder, radius 130 mm, z = 50 mm to 1,750 mm, in `stainlessSteel` (#b8c2c5). `lower-collar` and `upper-band` used the same control.

The source now has three colour controls. `towerPaint` ("Tower paint", default #e2e5e3, the value `offshore-wind-turbine` uses) colours the shell. `flangeSteel` ("Flange steel", default #7f8b8e) colours the lower collar and the upper band. `paintedSteel` ("Painted steel", #53727c, unchanged) colours the access panel. The `stainlessSteel` control is removed. The `weathered` preset sets all three controls; the `highVisibility` preset keeps its one `paintedSteel` value.

The shell is a ruled loft between two twelve-sided rings: radius 150 mm at z = 50 mm and radius 110 mm at z = 1,750 mm. A flat of the ring faces -Y, so the access panel sits on a flat wall. The panel position is unchanged; its back face is inside the shell and its front face stands 3 mm to 11 mm proud of the wall. The upper band radius changes from 150 mm to 135 mm to follow the smaller top.

Part names and the two preset names are unchanged. The mesh keeps 144 triangles within the 300-triangle budget. The bounds are unchanged (0.36 m × 0.36 m × 1.75 m). The header comment, the description and the kit README row now name the shell, the flanges and the access panel.

Noted, not corrected: the removal of `stainlessSteel` changes the control set, so a saved customisation of that control no longer applies. The asset is a stylised prop, 1.75 m tall at scale 1; it is not a full-size tower can. The collar and band are eight-sided on a twelve-sided shell. The shell has no weld seams, bolt circle or internal ladder. In the rendered preview the pale tower paint is in shade on the visible side and reads as mid-grey; the top cap shows the true value.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls contain `stainlessSteel` and lack `towerPaint` and `flangeSteel`); it passes after the correction (1/1). It checks the shell, flange and panel colours, the shell base radius (150 mm) and top radius (110 mm) from the mesh vertices, that both flanges stand proud of the shell, that the access panel is set into the shell wall, and the overall width and height.
- ESLint is clean. The wind-energy kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 171 files / 241 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row; the row lists the new controls and no `stainlessSteel` control.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The shell radii are proportions chosen for the model; they are not taken from a tower drawing. The change is not deployed, so no post-deployment page check is claimed.
