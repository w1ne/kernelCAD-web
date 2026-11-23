# Data-center infrastructure: raised floor tile panel material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/raised-floor-tile.png) · [after preview](after/raised-floor-tile.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/raised-floor-tile` now has a painted-steel tile that sits on
stringers above its pedestals. Before, `tile-panel` (600 x 600 x 45 mm, the tile body) was on
the `polymer` control, so the preview showed an amber slab. Access-floor tiles are steel or cast
aluminium because they carry rack and foot loads. The four steel pedestals (z 0-150 mm) also
stood up through the tile, and the `stringer-x/y` cross (z 145-173 mm) floated above it.

After: pedestals run z 0-122 mm. Four steel `stringer-front/rear/left/right` (28 x 28 mm,
z 122-150 mm) join the pedestal heads under the tile edges. `tile-panel` uses `steel`
(588 x 588 x 35 mm) at z 150-185 mm. The redundant `edge-frame` slab is removed. The `polymer`
control now drives four 6 mm `edge-trim-*` bands that wrap the panel to 600 x 600 mm, and its
default (and the `facilityStandard` preset) changes from amber `#c99b35` to dark grey `#2f3438`;
`highVisibility` is unchanged. Four `corner-fastener-*` hold-down screws sit on the tile top over
the pedestals. The description and the kit README row are updated. Triangles: 268 -> 460
(budget 2,200).

## Evidence

- `tests/integration/catalog/raisedFloorTileMaterial.test.ts` fails on the original source
  (`tile-panel should use the painted-steel finish`) and passes after the fix. It checks the
  exported GLB: tile panel, stringers, pedestals and fasteners in the steel colour, four
  edge-trim bands in the polymer colour, pedestal tops at or below the stringer bottoms, stringer
  tops at or below the panel bottom (0.150 m), and fasteners on the panel top. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used an
  unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts raised-floor-tile`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 199 files, 291 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Not corrected: the pedestals stand
50 mm in from the tile corners instead of on shared corner heads, and have no base plates or
height-adjust nuts.
