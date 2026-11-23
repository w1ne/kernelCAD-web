# Telecom infrastructure: GNSS timing antenna radome material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/gnss-timing-antenna.png) · [after preview](after/gnss-timing-antenna.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/gnss-timing-antenna` now has one polymer radome over the antenna element
and no metal above it. Before, the topmost `cap` (310 mm diameter, 35 mm thick) used the
`powderCoat` steel control and covered the polymer `puck`. A GNSS antenna needs an open view of
the sky, and metal above the element blocks the satellite signal, so a real timing antenna puts
the element under a polymer radome. The 290 mm puck was also oversized for a timing antenna.

After: a white polymer `radome` (revolved dome, 148 mm diameter, 103 mm tall) sits on a dark
polymer `base-skirt` (152 mm diameter) and threaded `bush` at the top of a galvanized 48 mm
`pole`. A polymer `cable-gland`, `cable-run` and `cable-drop` show the coax exit. The pipe stands
on a powder-coated 180 x 180 x 12 mm `base` plate with four galvanized `bolt-*` heads. A new
`radome` control (default `#eceee9`) is added; the `polymer` default changes from `#315267` to
`#22282b` (dark base and cable jacket); `powderCoat` now drives only the base plate. Both presets
carry a radome value. Description, header comment and kit README row are updated. Triangles:
176 -> 594 (budget 900).

## Evidence

- `tests/integration/catalog/gnssTimingAntennaRadome.test.ts` fails on the original source
  (`no powder-coated steel cap may sit over the antenna element`) and passes after the fix. It
  checks the exported GLB: no `cap` node, the radome in the radome colour, the skirt, bush and
  cable parts in the dark polymer colour, the pole and bolts galvanized, the plate powder-coated,
  the colour knob list, that every other part stays at least 50 mm below the radome top, and that
  the radome sits on the base skirt. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used an unchanged copy of the original source in
  a temporary kit folder.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts gnss-timing-antenna`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 201 files, 293 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. No RF analysis: the claim is only
that no modelled metal part sits above the antenna element. Not modelled: N-type connector,
mount thread detail.
