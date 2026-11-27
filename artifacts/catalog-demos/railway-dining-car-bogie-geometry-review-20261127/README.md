# Railway: dining car bogies and dining-car detail (2026-11-27)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/dining-car.png) · [after preview](after/dining-car.png) · [inspection views](inspect/) · [six-preview audit ledger](preview-review.md)

## Result

`railway/dining-car` now rides on two bogies with wheels on both rails and reads as a dining car,
not a plain coach. Before, all four wheels were at `y = -170`, outside the body on one side, so the
far rail had no wheels. There was no bogie part: the wheel tops (z 156) pushed into the underframe
(z 121-203). Windows were on the near side only, and the description named end doors that the
source did not have.

After:

- Body (`paintedSteel`): body box, an arched roof with an 8 mm eave overhang, a skirt on each side.
- Dining-car detail: six saloon windows and two small high galley windows on each side (`glass`); a
  stainless galley exhaust hood with a cap, two flue stacks and five roof ventilators; stainless
  belt and letterboard mouldings (`stainlessSteel`).
- Doors: a hinged side entrance door at the saloon end on each side, with a window, two stainless
  grab rails and a hanging step; a glazed end door at each end with two stainless grab rails.
- Underframe and running gear (`railSteel`, default `#626b70` -> `#3c4245`): centre sill, side
  sills, body bolsters, end sills, couplers at sill height, a water tank on two straps. Two bogies,
  each with two axles, a wheel and a flange on both rails (8 wheels), journal boxes, two side frames
  and a bolster. The bogie geometry is the same as `freight-boxcar` and `hopper-wagon`.

The control names (`scale`, `railSteel`, `paintedSteel`, `glass`, `stainlessSteel`) and the two
presets (`weathered`, `freshService`) and their values are unchanged. Only the `railSteel` default
changes, so that the running gear separates from the brown body. Description and header comment are
updated. Triangles: 296 -> 2292 (budget 1800 -> 3600).

## Evidence

- `tests/integration/catalog/diningCarRunningGear.test.ts` fails on the original source
  (`two bogies with two wheel pairs each: expected 4 to be 8`) and passes after the change. It reads
  the exported GLB and checks: controls and presets; 8 wheels, 4 on each rail; 4 axles that span
  both rails; 4 bogie side frames; flanges on z = 0 and treads 8 mm above; every wheel top below
  the centre sill and inside the body width; saloon and galley windows in equal numbers on both
  sides, outside the body; one end door beyond each end and one side door outside each side.
  Logs: `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used a
  temporary copy of the test pointed at a copy of the kit with the original source, so the
  repository file was not swapped.
- `npx kernelcad render inspect` front, right, top and iso views, before and after: `inspect/`. The
  right (end) view shows one wheel outside the body below the car before, and a wheel on each rail,
  the arched roof, the end door and the galley flue after. The `mechanism.interpenetration` badge is
  present before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts dining-car`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- Quality gate, catalog integration tests and eslint: `verification/`.

## Limits

Local source and software-rendered preview only. Not deployed. The car keeps the kit's stylised
scale (1.44 m body, 156 mm wheels), shared with the other railway cars; it is not a real-size car
and no vendor drawing is used. The bogie is the kit's simplified three-piece bogie, not a passenger
bogie with springs or brake rigging. Doors are closed and solid; there is no interior, gangway
diaphragm or kitchen equipment. No structural, load or gauge check.
