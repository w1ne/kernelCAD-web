# Telecom infrastructure: antenna sector frame brace finish review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/antenna-sector-frame.png) · [after preview](after/antenna-sector-frame.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/antenna-sector-frame` now has one galvanized finish on both brace levels.
Before, the `top` brace (500 x 100 x 60 mm) used the `powderCoat` control, so the preview showed
a teal top bar, while the matching `bottom` brace used `galvanizedSteel`. A welded sector frame is
hot-dip galvanized as one piece, so the two brace levels cannot have different finishes. The
asset was also described as triangular, but `rail-a/b/c` stood in one line at y = 0, and the
stand-off arm met no brace.

After: three galvanized mounting pipes (`rail-a/b/c`, 76 mm diameter, 1,100 mm tall) stand at
the corners of an equilateral triangle on a 260 mm circumradius. Six galvanized braces
(`top-brace-ab/bc/ca` at z 990-1040 mm, `bottom-brace-ab/bc/ca` at z 60-110 mm) join them. A
galvanized `mid-brace-bc` on the rear face carries the `mount-arm` to the stainless `clamp`. The
unused `powderCoat` control is removed. A new `polymer` control (default `#22282b`) drives three
`pipe-cap-*` caps. The description and the kit README row are updated. Triangles: 84 -> 372
(budget 900).

## Evidence

- `tests/integration/catalog/antennaSectorFrameFinish.test.ts` fails on the original source
  (`top should use the galvanized finish`) and passes after the fix. It checks the exported GLB:
  all six brace nodes, the rails, the mid-brace and the arm in the galvanized colour, the caps in
  the polymer colour, the clamp in the stainless colour, the colour knob list, and that the three
  rail centres form an equilateral triangle with 0.450 m sides. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used an
  unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts antenna-sector-frame`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 200 files, 292 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. Not corrected: the faces carry no
antenna mounting pipes or U-bolts, and the clamp is a block rather than a clamp around a pole.
