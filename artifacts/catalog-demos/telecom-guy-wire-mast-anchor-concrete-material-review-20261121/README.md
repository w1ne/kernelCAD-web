# Telecom infrastructure: guyed mast anchor concrete material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/guy-wire-mast-anchor.png) · [after preview](after/guy-wire-mast-anchor.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/guy-wire-mast-anchor` now sets its guys in concrete. Before, the three
ground anchors (`anchor-a/b/c`, 180 x 180 x 30 mm) were galvanized steel slabs that lay on the
surface, and the mast `base` was a teal `powderCoat` steel disc. A guy anchor is a galvanized
anchor rod set in a buried concrete deadman, and a mast stub stands on a concrete pier. The three
guys also ended at half the anchor distance (380 mm short of each anchor, at z 30 mm), so no wire
reached an anchor.

After: a new `concrete` control (`#a5a29a`) drives a 400 mm-diameter, 120 mm-high `pier` and three
`deadman-*` blocks (240 x 240 x 40 mm above grade) at 120 degrees, 760 mm from the mast. The
galvanized mast stands on a 260 mm `base-plate` on the pier and carries a `guy-band` at z 860 mm.
Each guy runs in one straight line from a galvanized `anchor-rod-*` that rises out of its deadman,
through a `turnbuckle-*`, to the band. A new `guyGuard` control (`#e3b21b`) drives a yellow guard
sleeve on the low end of each guy. Colour controls are now `galvanizedSteel`, `concrete` (new) and
`guyGuard` (new); `powderCoat` is removed. Both presets carry all three values. Description,
header comment and kit README row are updated. Triangles: 256 -> 752 (budget 900, unchanged).

## Evidence

- `tests/integration/catalog/guyWireMastAnchorMaterial.test.ts` fails on the original source
  (`no galvanized steel slab may stand in for a guy anchor`) and passes after the fix. It checks
  the exported GLB: no `anchor-*` or `base` node, the pier and deadmen concrete, the mast, plate,
  band, rods, turnbuckles and guys galvanized, the guards yellow, the colour knob list, that the
  pier stands on the ground with the plate on it, that each anchor rod starts on its deadman top,
  and that each guy reaches the mast-head band. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used an unchanged copy of the original source
  in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts guy-wire-mast-anchor`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 204 files, 296 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Concrete is shown by colour only;
the deadmen are drawn above grade only, with no buried depth. Not modelled: guy pre-tension,
thimbles and wire-rope clips, anchor-rod eye nuts, guy radius or angle design rules.
