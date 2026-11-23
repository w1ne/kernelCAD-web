# Telecom infrastructure: remote power shelf chassis material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/remote-power-shelf.png) · [after preview](after/remote-power-shelf.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/remote-power-shelf` is now one powder-coated 19-inch, 3U rack DC power
shelf. Before, the `shelf` body was `galvanizedSteel` while a `powderCoat` `top` band, the two
module faces and the handles were painted: two finishes on one chassis. The "top lip" was a band
round the body at z 190-230 mm, the body (680 x 360 x 340 mm) did not fit a 19-inch rack, and there
were no rack ears.

After: a 440 x 330 x 133 mm chassis (`chassis`) and two L-shaped rack ears (`ear-left`,
`ear-right`, 483 mm over both ears) all use `powderCoat`. Two stainless rack screws sit on each ear
flange. The front carries a controller (`controller`, with a polymer `display` and two `port-*`)
and four hot-swap rectifier modules (`rectifier-0..3`) with aluminium faces, five polymer vent slots
each and a polymer U-shaped pull handle (path profile, extruded). A polymer `terminal-cover` sits on
the rear. Colour controls are now `powderCoat`, `aluminium` (new), `stainlessSteel` (new) and
`polymer` (new); `galvanizedSteel` is removed. Both presets carry all four values. Description,
header comment and kit README row are updated. Triangles: 72 -> 688 (budget 900 -> 1000).

## Evidence

- `tests/integration/catalog/remotePowerShelfMaterial.test.ts` fails on the original source
  (`the shelf should have no galvanized body finish`) and passes after the fix. It checks the
  exported GLB: no `shelf`, `top` or `module-*` node, the colour knob list, the chassis and ears
  powder-coated, module faces aluminium, rack screws stainless, handles, vents, display, ports and
  cover polymer; that the chassis is 440 mm wide and 133 mm tall, the ears span 483 mm, bear on the
  chassis sides and run its full height with the flange on the chassis front; that each rack screw
  sits on its ear flange outside the chassis; and that each rectifier face sits on the chassis front
  with its handle and vents on the face. Logs: `verification/test-before.txt`,
  `verification/test-after.txt`. The "before" run used the original source swapped into the kit
  file and then restored.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts remote-power-shelf`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 207 files, 299 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The rack is not drawn. Modules are
face plates on a solid chassis, not removable bodies; vents are dark strips, not openings; there are
no LEDs, breakers or DC output cables. No electrical, thermal or load check.
