# Telecom infrastructure: fiber drop terminal housing material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/fiber-drop-terminal.png) · [after preview](after/fiber-drop-terminal.png) · [six-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/fiber-drop-terminal` is now a moulded polymer multiport service terminal on a
pole. Before, the `case`, `hood` and `face` were `powderCoat` steel: a painted steel box standing on
the ground. A fiber drop terminal is a moulded polymer housing, and it is mounted on a pole, strand or
wall. The model had no mount and no cable entry, and the hood was a slab wider than the case.

After: a 220 mm wood `pole` section carries a stainless `bracket` held by two stainless
`band-strap-*`. The `housing` (400 x 150 x 190 mm, chamfered cross-section path extruded along its
length) sits on the bracket. A black `lid-seam` rings the housing, with four stainless `lid-screw-*`
on the lid front. Six hardened drop ports sit in one row below the seam; each is a housing-colour
`port-boss-*` closed by a black `port-cap-*`. A black `tether-gland` under the housing feeds a
`tether-cable` that drops to the ground. Colour controls are now `housing` (new), `polymer`,
`stainlessSteel` (new) and `poleWood` (new); `powderCoat` is removed. Both presets carry all four
values. Description, header comment and kit README row are updated. Triangles: 300 -> 976 (budget
900 -> 1100).

## Evidence

- `tests/integration/catalog/fiberDropTerminalMaterial.test.ts` fails on the original source
  (`the terminal should have no powder-coated steel finish`) and passes after the fix. It checks the
  exported GLB: no `case`, `hood`, `face` or `port-0` node, the colour knob list, the housing and port
  bosses in the housing colour, caps, seam, gland and cable black polymer, bracket, straps and screws
  stainless, the pole wood; that pole, bracket and housing stack back to front without gaps; that the
  bracket spans the housing height and the straps wrap the pole within the bracket height; that the
  seam is on the housing sides and the screws sit on the lid front above it; that each port boss
  stands on the housing front below the seam and its cap closes it; and that the gland sits under the
  housing and the cable runs from the gland to the ground. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used a temporary copy of the test pointed at a copy
  of the kit with the original source, so the repository file was not swapped.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts fiber-drop-terminal`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 209 files, 301 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The housing is a solid; there are no
splice trays or internal fibre. The lid seam is dark on a dark housing and does not show at preview
scale. The tether hangs free beside the pole; it is not strapped to the pole and has no slack coil.
The ports are generic hardened-connector bosses, not a specific vendor's port. No structural, ingress
or optical check.
