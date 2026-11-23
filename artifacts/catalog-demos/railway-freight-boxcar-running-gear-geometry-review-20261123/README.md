# Railway: freight boxcar running gear and body detail (2026-11-23)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/freight-boxcar.png) · [after preview](after/freight-boxcar.png) · [inspection views](inspect/) · [six-preview audit ledger](preview-review.md)

## Result

`railway/freight-boxcar` now rides on wheels on both rails, couples at sill height and reads as a
boxcar with posts, an arched ribbed roof and a door on each side. Before, all four wheels were at
`y = -170`, so the far rail had no wheels. The couplers (z 71-123) were below the underframe
(z 126-218), and the preview showed one as a block on the ground. The two ladders ran from z 72,
below the frame, on the near side only. The description named roof ribs and end ladders that the
source did not have.

After:

- Body (`paintedSteel`, default brown `#6c4a36`): box body, an arched roof with a 10 mm eave
  overhang, six roof ribs, eight exterior side posts and a belt rail on each side, three end ribs
  on each end.
- Doors: one sliding door on each side, outside the posts, with three panel ribs; a galvanized latch
  bar, top track, bottom track and door stop. The tracks run past the door toward +X so that the door
  can open.
- Underframe and running gear (`railSteel`, default `#3c4245`): centre sill, side sills, body
  bolsters, end sills, coupler shanks and knuckles at sill height. Two bogies, each with two axles, a
  wheel and a flange on both rails (8 wheels), journal boxes, two side frames and a bolster. The
  bogie geometry is the same as `hopper-wagon`.
- Ladders (`galvanizedSteel`): a side ladder over a hanging sill step at diagonally opposite
  corners, and an end ladder at each end. Hand brake staff and wheel at the a end.

The control names (`scale`, `railSteel`, `paintedSteel`, `galvanizedSteel`) and the two presets
(`weathered`, `freshService`) and their values are unchanged. The `railSteel`, `paintedSteel` and
`galvanizedSteel` defaults change so that the running gear separates from the body. Description and
header comment are updated. Triangles: 308 -> 2528 (budget 1800 -> 3600).

## Evidence

- `tests/integration/catalog/freightBoxcarRunningGear.test.ts` fails on the original source
  (`two bogies with two wheel pairs each: expected 4 to be 8`) and passes after the change. It reads
  the exported GLB and checks: controls and presets; 8 wheels, 4 on each rail; 4 axles that span
  both rails; flanges on z = 0 and treads 8 mm above; both coupler knuckles on the centre line, in the
  sill height band and beyond the body ends; all 8 ladder rails start above the body underside; one
  sliding door outside each side of the body. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used a temporary copy of the test pointed at a copy
  of the kit with the original source, so the repository file was not swapped.
- `npx kernelcad render inspect` front, right, top and iso views, before and after: `inspect/`. The
  right (end) view shows one wheel set and a coupler block below the car before, and a wheel on each
  rail, the arched roof and the end ladder after. The `mechanism.interpenetration` badge is present
  before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts freight-boxcar`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 -I scripts/checkCatalogQuality.py --kit railway`: 40/40 assets pass.
- Catalog integration tests and eslint: `verification/catalog-integration.txt`,
  `verification/eslint.txt`.

## Limits

Local source and software-rendered preview only. Not deployed. The car keeps the kit's stylised
scale (1.4 m body, 156 mm wheels), shared with the other railway wagons; it is not a real-size car
and no vendor drawing is used. The bogie is a simplified three-piece freight bogie without springs
or brake rigging. The door is closed and solid; there is no door opening or interior. No structural,
load or gauge check.
