# Telecom infrastructure: wall mast bracket galvanized material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/wall-mast-bracket.png) · [after preview](after/wall-mast-bracket.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/wall-mast-bracket` is now one galvanized weldment that clamps a mast.
Before, the `backplate` (300 x 60 x 900 mm) was the only `powderCoat` part (teal painted steel),
while the arms and gussets welded to it were galvanized. A welded stand-off bracket is hot-dip
galvanized as one part, so it has one finish. The two `clamp-*` parts were solid stainless
cylinders, 170 mm across, at the middle of the arms, with no mast in them.

After: the wall plate (300 x 12 x 760 mm), both arms (60 x 60 mm, 380 mm from the wall face), a
triangular `gusset-*` under each arm and an end `saddle-*` plate on each arm are all
`galvanizedSteel`. A galvanized 76 mm `mast` pipe bears on both saddles. Two stainless `u-bolt-*`
parts per arm wrap the far side of the mast; their legs pass back through the saddle into
stainless nuts. Four stainless `anchor-bolt-*` heads hold the plate to the wall. A new `polymer`
control (`#22292d`) drives the two `mast-cap-*` pipe end caps. Colour controls are now
`galvanizedSteel`, `stainlessSteel` and `polymer` (new); `powderCoat` is removed. Both presets
carry all three values. Description, header comment and kit README row are updated. Triangles:
148 -> 1072 (budget 900 -> 1200).

## Evidence

- `tests/integration/catalog/wallMastBracketMaterial.test.ts` fails on the original source
  (`backplate should use the galvanized finish of the welded bracket`) and passes after the fix.
  It checks the exported GLB: no `clamp-*` or old `gusset-a/b` node, the plate, arms, gussets,
  saddles and mast galvanized, the U-bolts, nuts and anchor bolts stainless, the caps polymer,
  the colour knob list, that the plate starts at the ground line, that each arm runs from the
  plate face to its saddle, that the mast bears on each saddle, that each gusset sits under its
  arm, and that each U-bolt wraps the mast and passes back through the saddle. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used an
  unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts wall-mast-bracket`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 205 files, 297 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The mast is a short stub to show
the clamp, not a sized antenna mast. Arms are solid square bars, not hollow sections. U-bolts are
flat 10 mm straps in plan, not round rod; no threads, washers or wall anchors below the plate face.
No load, wind or wall-fixing check.
