# Telecom infrastructure: split cable duct HDPE material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/split-cable-duct.png) · [after preview](after/split-cable-duct.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/split-cable-duct` is now an HDPE split duct. Before, the two `base-*` and
two `lid-*` slabs (each 260 x 480 mm) used the `powderCoat` steel control (default teal
`#318b96`), with a galvanized `center-join` strip on top. A telecom split duct is an HDPE conduit
split lengthwise, so it can close around cables that are already in place. The model was also
solid, with no bore and no cables, and the lids floated 5 mm above the bases. The preview read as
two stacked teal slabs.

After: two extruded HDPE half shells (`shell-upper`, `shell-lower`; 150 mm outside diameter, 8 mm
wall, 500 mm long) meet on 24 mm side flanges at the split seam. The lower shell rests on the
ground. Six stainless `bolt-*` heads and six `nut-*` hold the flanges. Three black polymer
`cable-*` lie in the bore and leave both open ends by 60 mm. Colour controls are now `duct` (new,
`#e07a1f`), `stainlessSteel` and `polymer` (new, `#22292d`); `powderCoat` and `galvanizedSteel` are
removed. Both presets carry all three values (field site: black HDPE; high visibility: yellow).
Description, header comment and kit README row are updated. Triangles: 60 -> 892 (budget
900 -> 1200).

## Evidence

- `tests/integration/catalog/splitCableDuctMaterial.test.ts` fails on the original source
  (`no powder-coated steel base or lid slab may form the duct`) and passes after the fix. It
  checks the exported GLB: no `base-*`, `lid-*` or `center-join` node, both shells in the duct
  colour, the bolts and nuts stainless, the cables black polymer, the colour knob list, that the
  lower shell rests on the ground, that the shells meet on the seam with a 150 mm total height,
  and that each cable lies in the bore and leaves both duct ends. Logs:
  `verification/test-before.txt`, `verification/test-after.txt`. The "before" run used an
  unchanged copy of the original source in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts split-cable-duct`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 203 files, 295 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. HDPE is shown by colour only;
no material properties are modelled. Not modelled: snap or tongue-and-groove seam variants, end
seals, bend radius, burial or wall fixing.
