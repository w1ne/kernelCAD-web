# Railway: maintenance railcar running gear, cab and deck (2026-11-27)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/maintenance-railcar.png) · [after preview](after/maintenance-railcar.png) · [inspection views](inspect/) · [six-preview audit ledger](preview-review.md)

## Result

`railway/maintenance-railcar` now runs on two axles with a wheel on each rail and reads as a
self-propelled track maintenance car. Before, all four wheels were at `y = -160`, so the far rail
had no wheels. There was no axle, axle box or horn guide, and the wheel tops (z 152) pushed into
the frame (z 117-207). The cab was a solid box with no windows or doors, and the open deck had no
handrails. There were no buffers or couplers.

After:

- Frame (`safetyPaint`, `railSteel`): solebars, cross members, a steel deck plate with painted
  edges, a buffer beam at each end with two buffers and a coupler hook.
- Running gear (`railSteel`, horn guides in `safetyPaint`): two axles on a 600 mm wheelbase, each
  with a wheel and a flange on both rails, axle boxes in tapered horn guides with keepers, and a
  final drive on one axle with a torque arm to the deck.
- Driving cab (`safetyPaint`, roof in `paintedSteel`): a windscreen with a centre pillar, a rear
  window onto the deck, a side window and a door with a window, handle, grab rail and hanging step
  on each side, two headlights, and the amber roof beacon (`signalAmberGlass`) on a base with a cap.
- Working deck: a tool cabinet with a door seam and handles (`paintedSteel`); a folded jib crane with
  pedestal, slew ring, boom, boom rest, hook block and ram; handrails on both sides and the far end.

The four colour controls (`railSteel`, `safetyPaint`, `paintedSteel`, `signalAmberGlass`) and the
two presets keep their names and values. A `glass` control (Glazing) is added for the cab windows
and headlights, with a value in each preset. The `railSteel` default darkens (`#626b70` ->
`#3c4245`) to match the other rebuilt railway cars. Description and header comment are updated.
Triangles: 280 -> 2472 (budget 1800 -> 3000).

## Evidence

- `tests/integration/catalog/maintenanceRailcarRunningGear.test.ts` passes. It reads the exported
  GLB and checks: controls and presets; 4 wheels, 2 on each rail, with the wheel track centred on
  the car; 2 axles that span both rails; 4 horn guides; flanges on z = 0 and treads 8 mm above;
  every wheel top below the solebars and inside the deck width; the windscreen beyond the cab front
  and the rear window beyond the cab back; one side window and one door on each side of the cab;
  deck top rails behind the cab; the crane boom above the tool cabinet; 4 buffer heads and 2
  coupler hooks. On the original source it fails (`verification/test-before.txt`): first on the
  missing `glass` control, then, with that assertion removed, on `two wheels on one rail: expected
  4 to be 2`. The before runs used a temporary copy of the test pointed at a copy of the kit with
  the original source, so the repository file was not swapped.
- `npx kernelcad render inspect` front, right, top and iso views, before and after: `inspect/`. The
  right (end) view shows one wheel beside the body on one side before, and a wheel on each rail,
  the horn guides, buffers and handrails after. The `mechanism.interpenetration` badge is present
  before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts maintenance-railcar`. A first
  render showed the crane boom below the tool cabinet top (z 390 vs 436), hidden in the preview;
  the crane was raised before the final render.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- Quality gate, catalog integration tests and eslint: `verification/`.

## Limits

Local source and software-rendered preview only. Not deployed. The car keeps the kit's stylised
scale (0.96 m over buffer beams, 156 mm wheels), shared with the other reduced-scale railway cars;
it is not a real-size car and no vendor drawing is used. Doors are closed and solid; there is no
cab interior, engine, hydraulic circuit or brake rigging. The crane is a fixed transport pose, not
an articulated mechanism. No structural, load, lifting or gauge check.
