# Telecom infrastructure: conduit riser frame galvanized material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/conduit-riser-frame.png) · [after preview](after/conduit-riser-frame.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/conduit-riser-frame` is now one galvanized strut-channel frame that clamps
three conduits. Before, `bridge-top` was the only `powderCoat` part (teal painted steel), while
`bridge-bottom`, the same part type on the same frame, was galvanized. The three conduits passed in
front of the bars with no clamps, and the polymer `cable-band-*` parts were thin rings at one height.

After: two vertical 41 x 41 mm strut rails (`rail-left`, `rail-right`) stand on the wall face and
two horizontal strut bridges (`bridge-bottom`, `bridge-top`) are bolted across their fronts. All
four are open C-channel profiles with in-turned lips, in `galvanizedSteel`, with the three 80 mm
rigid conduits. Each conduit bears on the open face of both bridges and is held by a stainless strut
pipe clamp (`clamp-<bridge>-<i>`) whose ears sit flat on the bridge face, with a stainless bolt head
on each ear. Six stainless anchor bolts hold the rails to the wall and four stainless frame bolts
join bridges to rails. A polymer end bushing and a cable stub leave the top of each conduit. Colour
controls are now `galvanizedSteel`, `stainlessSteel` (new) and `polymer`; `powderCoat` is removed.
Both presets carry all three values. Description, header comment and kit README row are updated.
Triangles: 312 -> 2044 (budget 900 -> 2200).

## Evidence

- `tests/integration/catalog/conduitRiserFrameMaterial.test.ts` fails on the original source
  (`bridge-top should use the galvanized finish of the bottom bridge`) and passes after the fix. It
  checks the exported GLB: no `stand-off-*` or `cable-band-*` node, rails, bridges and conduits
  galvanized, clamps and all bolt heads stainless, bushings and cables polymer, the colour knob list,
  that the rails start at the ground line on the wall face, that each bridge bears on the rail fronts
  and spans both rails, that each conduit bears on each bridge face, that each clamp wraps its
  conduit with its ears on the bridge face and within the bridge height, and that each bushing caps
  its conduit with a cable leaving it. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used the original source swapped into the kit file
  and then restored.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts conduit-riser-frame`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 206 files, 298 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The wall is not drawn. Conduits are
plain cylinders with no couplings, threads or wall thickness; clamps are flat straps without the
channel nuts inside the strut. No load, seismic or fixing check.
