# Data-center infrastructure: wall-mount network cabinet door glass material review (2026-11-20)

**Demo:** [14-second local review MP4](review-demo.mp4) · [before preview](before/wall-mount-network-cabinet.png) · [after preview](after/wall-mount-network-cabinet.png) · [five-preview audit ledger](preview-review.md)

## Result

`data-center-infrastructure/wall-mount-network-cabinet` now has a glazed front door. Before, the
description said "framed door", but `front-door` (500 x 24 x 590 mm) was one solid block on the
`steel` control, so the preview showed an opaque dark slab. Wall-mount network cabinets normally
have a steel-framed tempered glass door, so staff can read switch status lights without opening
it. The door is now two 45 mm steel stiles (`door-stile-left/right`) and two 60 mm rails
(`door-rail-bottom/top`) around a 6 mm `door-glass` panel (410 x 470 mm) on a new `glass`
control (`#8fb8c4`, "Tempered glass"). Both presets (`facilityStandard`, `highVisibility`) set
all three colour controls (`steel`, `glass`, `rubber`). The description now says "a
painted-steel framed door with a tempered glass panel". Triangles: 288 -> 336 (budget 2,200).

## Evidence

- `tests/integration/catalog/wallCabinetDoorGlassMaterial.test.ts` fails on the original source
  (`expected [ 'rubber', 'steel' ] to deeply equal [ 'glass', 'rubber', 'steel' ]`) and passes
  after the fix. It checks the exported GLB: top frame, door stiles, door rails and lock in the
  steel colour, the door panel in the glass colour, a foot in the rubber colour. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts wall-mount-network-cabinet`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 196 files, 288 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The preview renderer has no
transparency, so the glass reads as a light tinted panel, not see-through. Noted, not fixed:
the front rack rails stand in front of the door and cover the glass edges; the wall cabinet
still has a floor plinth and front leveling feet.
