# Five-preview semantic audit — 20 November 2026 (wind energy site and foundation assets)

## Selection and exclusions

Reviewed the current rendered previews for five wind-energy assets: `wind-site-bollard`, `crane-outrigger-pad`, `cable-trench-cover`, `foundation-inspection-hatch` and `turbine-junction-box`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The open-PR search for `wind-site-bollard`, `crane-outrigger-pad` and `cable-trench-cover` returns only the lane PR #1507 itself; no other open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `1021a9f26`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`wind-site-bollard` drew its two reflector bands (`band-low`, `band-high`) with a `stainlessSteel` control ("Stainless steel"). A reflector band on a site bollard is retroreflective sheeting, not stainless steel. The preview showed two grey steel collars on the yellow post, so the bollard had no reflector.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `wind-site-bollard` | A yellow post with a yellow cap on a grey concrete foot. Two narrow grey rings stand proud of the post. No reflective band shows. The source confirms it: `band-low` and `band-high` use `stainlessSteel`, radius 63 mm on a 55 mm post, 40 mm tall. | Selected: replace the stainless control with a reflective sheeting control and draw each band as a thin 80 mm wrap. |
| `crane-outrigger-pad` | A plain green slab with four ribs under it. No top plate shows. The source confirms it: `top-plate` (820 mm × 820 mm, z = 90 mm to 110 mm, `structuralSteel`) is inside the `pad` (900 mm × 900 mm, z = 40 mm to 120 mm), so the `structuralSteel` control has no visible effect. The description names "four corner chamfers"; the pad corners are square. A polymer outrigger pad is a real construction. | Hidden top plate and missing chamfers noted for a later round. This is a placement defect, not a material mismatch. No change. |
| `cable-trench-cover` | A grey slab with two small yellow patches on the top face and four small notches on the long edge. No rib or slot shows. The source confirms it: `rib-0` to `rib-3` (z = 50 mm to 85 mm) are inside the `lid` (z = 0 mm to 90 mm) and show only 10 mm at each end; `slot-left` and `slot-right` are 15 mm `safetyPaint` blocks with their top face on the lid top face, not openings. A 90 mm solid galvanized steel slab is not a real cover construction, but the title does not name the material. | Hidden ribs and painted "slots" noted for a later round. No change. |
| `foundation-inspection-hatch` | A dark 12-sided rim with a raised dark lid and two pale grey blocks at the lid edge. No bolt shows. The source confirms it: `bolt-a` and `bolt-b` (radius 18 mm, z = 65 mm to 90 mm) are inside the `lid` (radius 270 mm, z = 65 mm to 100 mm); `tab-left` and `tab-right` are centred 302 mm from the axis, outside the lid radius, and hang 30 mm above the rim. Stainless lift tabs and bolts on a painted steel hatch are a plausible material set. | Hidden bolts and overhanging tabs noted for a later round. No material change. |
| `turbine-junction-box` | A teal box with a wider teal band around its middle, three dark stubs under it and two teal blocks below the ends. The source confirms it: `lid` (z = 215 mm to 245 mm) lies inside the height of the `case` (z = 100 mm to 300 mm), so it reads as a mid-body band, not a lid; `foot--160` and `foot-160` end at z = 65 mm, 35 mm below the case. Polymer cable glands under a powder-coated steel case are a plausible material set. | Mid-body "lid" and floating feet noted for a later round. No material change. |

## Correction

Before, the source had three colour controls: `safetyPaint` (#efb532; `post`, `cap`), `stainlessSteel` (#b8c2c5; `band-low`, `band-high`) and `concrete` (#8b8c84; `foot`).

After:

- A new `reflectiveBand` control ("Reflective sheeting", default red #d5322c) replaces `stainlessSteel`. The `weathered` preset sets it to a faded #b04a41.
- `band-low` is z = 200 mm to 280 mm and `band-high` is z = 510 mm to 590 mm. Each band is 80 mm tall (was 40 mm) at the same centre height, and its radius is 58 mm (was 63 mm), so it is a 3 mm wrap on the 55 mm post, not an 8 mm collar.
- `foot`, `post` and `cap` are unchanged.

The mesh stays at 188 triangles in a 400-triangle budget. The bounds stay 0.22 m × 0.22 m × 0.79 m. The header comment, the description and the kit README row now name the reflective sheeting bands.

Compatibility note: the `stainlessSteel` control is removed, because the bands were its only parts. A saved scene that set `stainlessSteel` on this asset must set `reflectiveBand` instead. All five part names are kept.

Default colour: a white band was tried first. The preview renderer shades the side faces, so white sheeting rendered as mid grey and still read as steel. Red sheeting is also a usual bollard marking and reads clearly; a user can set `reflectiveBand` to white.

Noted, not corrected: the preview renderer has no retroreflective or emissive finish, so the band is a flat colour. The cap is a flat disc, not a domed cap. The post is a solid 12-sided cylinder. The `highVisibility` preset sets `safetyPaint` to #d29f2c, which is darker than the default.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls still include `stainlessSteel`); it passes after the correction (1/1). It checks the three colour controls and the control label, the finish of all five parts, the band heights and positions, that each band is at most 3 mm proud of the post and inside the cap radius, the unchanged triangle count and the overall bounds.
- ESLint is clean. The wind-energy kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 176 files / 246 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, budget and bounds are unchanged and its colour controls match the corrected source.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
