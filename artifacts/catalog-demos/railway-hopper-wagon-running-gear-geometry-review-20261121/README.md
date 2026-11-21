# Railway: hopper wagon running gear and hopper silhouette (2026-11-21)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/hopper-wagon.png) · [after preview](after/hopper-wagon.png) · [inspection views](inspect/) · [six-preview audit ledger](preview-review.md)

## Result

`railway/hopper-wagon` now reads as an open-top two-bay hopper wagon and rides on wheels on both
rails. Before, all four wheels were at `y = -165`, so the far rail had no wheels. A closed 330 mm
`hopper-body` box covered the two sloped bay parts, so the preview showed a grey box with two top
rails, not a hopper. The default running gear colour (`#626b70`) and body paint (`#4a5358`) were
almost the same grey.

After:

- Body (`paintedSteel`, default oxide red `#7a3a2c`): two side sheets whose lower edge follows two
  V-shaped discharge pockets and a centre ridge, a 24 mm hopper floor with end slope sheets that are
  visible through the open top, end sheets, top chords and six external posts on each side.
- Discharge (`galvanizedSteel`): a gate frame and gate door under each pocket outlet, a transverse
  operating shaft and drive heads outside both side sheets.
- Running gear (`railSteel`, default `#3c4245`): two bogies, each with two axles, a wheel and a
  flange on both rails (8 wheels), journal boxes, two side frames and a bolster. Body bolsters,
  stub sills, end sills, coupler shanks and knuckles connect the body to the bogies and the ends.
- End fittings: galvanized ladders at both ends; hand brake staff and wheel at the a end.

The control names (`scale`, `railSteel`, `paintedSteel`, `galvanizedSteel`) and the two presets
(`weathered`, `freshService`) and their values are unchanged. Only the `railSteel`, `paintedSteel`
and `galvanizedSteel` defaults change. Description and header comment are updated. Triangles:
272 -> 1976 (budget 1800 -> 3200).

## Evidence

- `tests/integration/catalog/hopperWagonRunningGear.test.ts` fails on the original source
  (`two bogies with two wheel pairs each: expected 4 to be 8`) and passes after the change. It reads
  the exported GLB and checks: controls and presets; 8 wheels, 4 on each rail; 4 axles that span
  both rails; flanges on z = 0 and treads 8 mm above; the floor and side sheet reach more than 50 mm
  below the body bolsters, and the floor drops below the wheel tops; two gate doors under the floor between the
  bogies. Logs: `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used
  a temporary copy of the test pointed at a copy of the kit with the original source, so the
  repository file was not swapped.
- `npx kernelcad render inspect` front, right, top and iso views, before and after: `inspect/`. The
  right (end) view shows one wheel pair before and a wheel on each rail after; the top and iso views
  show the open top, end slopes and two pockets after. The `mechanism.interpenetration` badge is
  present before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts hopper-wagon`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 -I scripts/checkCatalogQuality.py --kit railway`: 40/40 assets pass.
- Catalog integration tests and eslint: `verification/catalog-integration.txt`,
  `verification/eslint.txt`.

## Limits

Local source and software-rendered preview only. Not deployed. The wagon keeps the kit's stylised
scale (1.38 m body, 156 mm wheels), shared with the other railway wagons; it is not a real-size car
and no vendor drawing is used. The bogie is a simplified three-piece freight bogie without springs
or brake rigging. The gates are a generic slide-gate shape. The hopper floor is a solid sheet, so
there is no interior centre sill hood. No structural, load or gauge check.
