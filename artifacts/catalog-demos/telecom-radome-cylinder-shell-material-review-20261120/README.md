# Telecom infrastructure: cylindrical radome shell material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/radome-cylinder.png) · [after preview](after/radome-cylinder.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/radome-cylinder` now has a fibreglass radome. Before, the 1050 mm
`shell` and the flat `cap` used the `powderCoat` steel control (default teal `#318b96`), and the
model had no radome colour control. A radome exists to let radio waves through to the antenna
inside it; a painted steel tube would block them. Real cylindrical radomes are fibreglass or
polymer. The preview read as a teal bollard. The "narrow mounting foot" was also wider than the
shell, and the "rounded-looking cap" was a flat octagon.

After: one revolved white fibreglass `radome` (216 mm diameter, 1064 mm tall, domed top) sits on a
galvanized `flange` (232 mm diameter). A stainless `clamp-band` and `band-screw` hold its base.
The flange stands on a narrow galvanized pipe `foot` (100 mm diameter, 160 mm tall) on a
260 x 260 x 12 mm galvanized `base` plate with four `bolt-*` heads. A black polymer
`cable-gland`, `cable-run` and `cable-drop` show the coax exit. Colour controls are now `radome`
(new, `#eeede6`), `galvanizedSteel`, `stainlessSteel` and `polymer` (new, `#22292d`);
`powderCoat` is removed. Both presets carry all four values. Description, header comment and
kit README row are updated. Triangles: 176 -> 634 (budget 900).

## Evidence

- `tests/integration/catalog/radomeCylinderMaterial.test.ts` fails on the original source
  (`no powder-coated steel shell or cap may form the radome`) and passes after the fix. It checks
  the exported GLB: no `shell` or `cap` node, the radome in the radome colour, the clamp parts
  stainless, the plate, foot, flange and bolts galvanized, the cable parts black polymer, the
  colour knob list, that the radome is over 1 m tall and sits on the flange, and that no other
  part rises more than 50 mm above the radome base. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used an unchanged copy of the original source
  in a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts radome-cylinder`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 202 files, 294 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. No RF analysis: the claim is only
that no modelled metal part covers the radome above its base band. Not modelled: drain hole,
mounting thread, the antenna inside.
