# Railway: turnout track with two rails on both routes (2026-11-28)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/turnout-track.png) · [after preview](after/turnout-track.png) · [inspection views](inspect/) · [six-preview audit ledger](preview-review.md)

## Result

`railway/turnout-track` now reads as a working set of points. Before, the diverging route had one
rail (`branch-rail`), so no vehicle could take it, and that rail ran to `y` about 360, past the
240 mm ballast half-width and the 230 mm sleeper half-length. There were no switch blades, no
stretcher bars or point machine, no frog nose or wing rails, and no check rails; the "frog" was a
box on the branch rail.

After:

- Both routes have two flat-bottom rails (foot, web, head) at the same 180 mm gauge. Every rail is
  a line `y = const` or an arc concentric with the diverging route (centre-line radius 3500 mm), so
  the gauge is exact on the curve.
- Switch: two tapered blades set for the straight route. The straight blade lies on the stock rail
  face; the curved blade stands 30 mm open at the tip, swung about its heel. Two stretcher bars in
  the cribs tie the blades. A point machine (`paintedSteel`) stands on two long timbers outside the
  straight stock rail, with a drive rod under that rail to the first stretcher bar.
- Crossing: the closure rails bend at the knuckles into wing rails beside a cast frog nose, with
  14 mm flangeways; a check rail on each outer rail stands opposite the frog.
- Support: 13 timbers square to the straight route, each 120 mm past the outermost rail above it,
  on a two-step ballast bed that follows the diverging track and widens at the toe for the machine.

The three colour controls (`ballast`, `railSteel`, `concrete`) and the two presets keep their names
and values. A `paintedSteel` control (Point machine paint) is added, with a value in each preset.
Description and header comment are updated. Triangles: 132 -> 2508 (budget 1800 -> 3000).

## Evidence

- `tests/integration/catalog/turnoutTrackRoutes.test.ts` passes. It reads the exported GLB and
  checks: controls and presets; the straight route rails on `y = -90` and `y = +90`; the diverging
  stock rail, curved closure rail and diverging exit rail on arcs of radius 3410 and 3590 mm about
  the route centre (180 mm gauge); the diverging route leaves the end at `y > 300`; the straight
  blade tip on the stock rail face and the curved blade tip 20 mm or more off the other one; both
  stretcher bars span the blades; the point machine outside the stock rail and its rod passing under
  the rail foot to the blades; the frog nose tip where the two gauge faces meet; wing and check
  rails at 14 mm flangeways; every vertex of the 11 rail, blade and frog parts over the nearest
  timber with 30 mm or more to its end; every timber inside the ballast bed. On the original source
  it fails (`verification/test-before.txt`): first on the missing `paintedSteel` control, then, with
  that assertion removed, on `part stock-rail-straight: expected undefined to be defined`. The before
  runs used a temporary copy of the test pointed at a copy of the kit under `/tmp`, so the repository
  file was not swapped.
- `npx kernelcad render inspect` front, right, top and iso views, before and after: `inspect/`, and
  a crop of the after top view at the frog (`inspect/after/top-frog-crop.png`). The top view shows
  one branch rail over the ballast edge before, and both routes, the open blade, the stretcher bars,
  the drive rod, the frog nose, the wing rails and the check rails after. The
  `mechanism.interpenetration` badge is present before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts turnout-track`. The script's
  console line printed `132 tris` from the index row that was not yet rebuilt; the rendered label
  reads `2508 tris`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- Quality gate, catalog integration tests and eslint: `verification/`.

## Limits

Local source and software-rendered preview only. Not deployed. The turnout keeps the kit's
stylised scale (1.5 m long, 180 mm gauge); it is not built to a track standard, and the other
railway track pieces use other gauges (`straight-track` 168 mm), so they do not join it. The blades
are fixed in the straight position (no route control). There are no rail fastenings, slide chairs,
fishplates, heel blocks or point-heating. No vehicle running, gauge-clearance or track-geometry check.
