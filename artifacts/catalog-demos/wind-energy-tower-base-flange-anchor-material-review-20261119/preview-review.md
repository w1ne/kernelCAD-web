# Five-preview semantic audit — 19 November 2026 (wind energy tower flange, blade-root and site assets)

## Selection and exclusions

Reviewed the current rendered previews for five wind-energy assets: `tower-base-flange`, `turbine-blade-root-sleeve`, `blade-root-protector`, `tower-transport-saddle` and `turbine-number-placard`. These source paths are absent from the open catalog PR #1507 diff. No open issue names them. The open-PR search for `tower-base-flange` returns only the lane PR #1507 itself, where an earlier round comment lists the asset as a candidate; no other open pull request names any of the five. No earlier ledger under `artifacts/catalog-demos/` names any of the five. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `90ce13582`; its `build-and-checks` job was pending and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Result: one material mismatch corrected

`tower-base-flange` drew its eight `anchor-*` parts with a `stainlessSteel` control ("Stainless steel"). Wind tower anchor bolts are high-strength carbon steel with a galvanized or coated finish; stainless steel is not used for them. The control also had no visible effect: each anchor was a boss 70 mm tall that started at the ground, inside the 90 mm flange, so the preview showed no anchor part.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `tower-base-flange` | A narrow dark post on a plain dark flange disc. No anchor part shows, and no part shows the pale stainless colour. It reads as a bollard base, not as a bolted tower flange. The source confirms it: `anchor-0` to `anchor-7` use `stainlessSteel`, radius 32 mm, z = 0 mm to 70 mm, at a 250 mm bolt-circle radius, all inside the `flange` (radius 310 mm, z = 0 mm to 90 mm); `sleeve` has a radius of 120 mm on a flange of 310 mm. | Selected: replace the stainless control with a galvanized anchor steel control, and draw each anchor as a stud with a nut on the flange around a wider shell stub. |
| `turbine-blade-root-sleeve` | A pale grey-green drum on a wider pale disc, with four small grey blocks on the disc. The source confirms it: `flange` and `sleeve` use `fiberglassComposite`; the four `lug-*` blocks use `stainlessSteel` and lie flat on the flange. A laminated root with a composite flange is plausible for a sleeve or cover, and the title does not say which. The description names an "inner collar" that the model lacks. | Missing inner collar noted. Material set is plausible; no change. |
| `blade-root-protector` | A pale drum on a grey ring. No securing tab shows. The source confirms it: `tab-0` to `tab-3` (60 mm × 90 mm × 50 mm, centred 180 mm from the axis, z = 20 mm to 70 mm) are inside the `ring` (radius 250 mm, z = 0 mm to 80 mm). A stainless clamp ring on a composite transport cover is a plausible material set. The asset is close to a copy of `turbine-blade-root-sleeve`. | Hidden securing tabs noted for a later round. This is a placement defect, not a material mismatch. No change. |
| `tower-transport-saddle` | Two long grey rails on the ground, two black upright slabs across them, and two grey posts at the rail ends. No cradle curve shows. The source confirms it: `support-left` and `support-right` are flat-topped 100 mm × 520 mm × 260 mm blocks in `elastomer`; a tower section needs a curved or V-shaped seat. `tie--500` and `tie-500` are upright cylinders 240 mm tall on the centre line, not cross ties between the rails. Solid elastomer blocks of this size are not a real saddle construction, but an elastomer-lined seat is plausible. | Flat supports and upright "ties" noted for a later round. No material change. |
| `turbine-number-placard` | An amber plate on a grey post with a concrete foot. A slightly raised amber panel shows on the plate face; no number or contrast legend shows. The source confirms it: `plate` and `border` both use `safetyPaint`, and `border` is a smaller panel inside the plate outline, not a border. The description says "numbered". | Same-colour inner panel and missing number noted for a later round. No change. |

## Correction

Before, the source had two colour controls: `structuralSteel` (#556971; `flange`, `sleeve`) and `stainlessSteel` (#b8c2c5; `anchor-0` to `anchor-7`). The mesh had 440 triangles in a 900-triangle budget.

After:

- A new `anchorSteel` control ("Galvanized anchor steel", default #a9b6b7) replaces `stainlessSteel`. The `weathered` preset sets it to #8c9896.
- `anchor-0` to `anchor-7` are studs of radius 16 mm, z = 60 mm to 150 mm. Each passes 30 mm into the flange and stands 60 mm above it.
- New parts `anchor-nut-0` to `anchor-nut-7` are nuts of radius 30 mm, z = 90 mm to 118 mm. Each sits on the flange top around its stud.
- `sleeve` is the tower shell stub. Its radius changes from 120 mm to 190 mm. The nuts clear it by 30 mm and stay 30 mm inside the flange rim.
- `flange` is unchanged.

The mesh has 792 triangles; `triangleBudget` rises from 900 to 1,100. The bounds stay 0.62 m × 0.62 m × 0.63 m. The header comment, the description and the kit README row now name the shell stub and the galvanized anchor studs with nuts.

Compatibility note: the `stainlessSteel` control is removed. A saved scene that set `stainlessSteel` on this asset must set `anchorSteel` instead. The eight `anchor-*` part names are kept; eight `anchor-nut-*` parts are new.

Noted, not corrected: the shell stub is a solid cylinder with no wall thickness or door. The kit template cylinder helper ignores its segment argument, so the nuts are 12-sided, not hexagonal. The model has no washers, grout bed or foundation. The 620 mm flange is the size of a small-turbine or mast base, not a utility-scale tower. From the fixed preview camera, two of the eight anchors are behind the shell.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (the colour controls still include `stainlessSteel`); it passes after the correction (1/1). It checks the two colour controls and the control label, the finish of all 18 parts, that each stud is on the 250 mm bolt circle, passes into the flange and stands 60 mm above it, that each nut sits on the flange top, is wider than its stud, clears the shell and stays on the flange, the shell stub radius, and the overall bounds.
- ESLint is clean. The wind-energy kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 175 files / 245 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, budget and colour controls match the corrected source.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, standards compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
