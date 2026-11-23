# Data-center infrastructure: perforated floor tile panel material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/perforated-floor-tile.png) · [after preview](after/perforated-floor-tile.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/perforated-floor-tile` now has a painted-steel tile panel that sits
on its pedestals. Before, `tile-panel` (600 x 600 x 45 mm, the tile body) was on the `polymer`
control, so the preview showed an amber slab. Perforated raised-floor tiles are steel or cast
aluminium because they carry rack and foot loads. The four steel pedestals (z 0-150 mm) also
stood up through the tile.

After: `tile-panel` uses `steel` (588 x 588 x 35 mm) at z 150-185 mm, on the pedestal heads.
The grille bars and lift ring sit on its top face. The redundant `edge-frame` slab is removed.
The `polymer` control now drives four 6 mm `edge-trim-*` bands that wrap the panel to
600 x 600 mm, as on real access-floor panels. The `polymer` default (and the `facilityStandard`
preset) changes from amber `#c99b35` to dark grey `#2f3438`; `highVisibility` is unchanged.
The description and the kit README row are updated. Triangles: 340 -> 376 (budget 2,200).

## Evidence

- `tests/integration/catalog/perforatedFloorTileMaterial.test.ts` fails on the original source
  (`tile-panel should use the painted-steel finish`) and passes after the fix. It checks the
  exported GLB: tile panel, bars, pedestals and lift ring in the steel colour, four edge-trim
  bands in the polymer colour, and every pedestal top at or below the panel bottom (0.150 m).
  Logs: `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used an
  unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts perforated-floor-tile`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 198 files, 290 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Not corrected: the tile still has
eight raised grille bars, not real perforations; the pedestals stand 50 mm in from the corners.
`raised-floor-tile` has the same polymer tile body and pedestal defect (next fix).
