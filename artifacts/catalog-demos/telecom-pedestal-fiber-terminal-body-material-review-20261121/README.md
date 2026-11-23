# Telecom infrastructure: pedestal fiber terminal body material review (2026-11-21)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/pedestal-fiber-terminal.png) · [after preview](after/pedestal-fiber-terminal.png) · [five-preview audit ledger](preview-review.md)

## Result

`telecom-infrastructure/pedestal-fiber-terminal` is now one painted fiber access pedestal on a
concrete pad. Before, the `pedestal` body was `galvanizedSteel` while the `base` slab, the flat `cap`
and the `door` slab were `powderCoat`: two finishes on one housing. The door had no seam, hinges or
lock, the cap was a flat plate rather than a cover over the body, and the two galvanized conduits
were hidden inside the body.

After: a concrete `pad` (520 x 440 x 80 mm) carries a powder-coated `base-flange` held by four
stainless `anchor-bolt-*`. The 300 x 240 mm `body` stands on the flange. A removable cover
(`cover-skirt`, 316 x 256 mm) slides 50 mm down over the body top and carries a gable `cover-roof`
(path profile, extruded; 50 mm rise). The front `door` sits on a polymer `door-seal` that shows a
6 mm seam round it, on two stainless `hinge-*` with a stainless penta-head `lock` on the latch side.
Four polymer louvre slots (`vent-left-*`, `vent-right-*`) sit on each side under the cover. Two
polymer HDPE ducts (`duct-0`, `duct-1`) rise from the ground through the pad into the body. Colour
controls are now `powderCoat`, `concrete` (new), `stainlessSteel` (new) and `polymer` (new);
`galvanizedSteel` is removed. Both presets carry all four values. Description, header comment and
kit README row are updated. Triangles: 136 -> 580 (budget 900).

## Evidence

- `tests/integration/catalog/pedestalFiberTerminalMaterial.test.ts` fails on the original source
  (`the pedestal should have no galvanized body finish`) and passes after the fix. It checks the
  exported GLB: no `pedestal`, `cap`, `base` or `conduit-*` node, the colour knob list, the body,
  cover, roof, door and flange powder-coated, the pad concrete, hinges, lock and anchor bolts
  stainless, seal, vents and ducts polymer; that pad, flange and body stack without gaps; that each
  anchor bolt sits on the flange outside the body; that the cover skirt encloses the body top and the
  roof (more than 40 mm tall) sits on the skirt; that the door sits on its seal on the body front,
  below the cover, with the hinges on its edge and the lock on its face on the latch side; that the
  vents sit on the body sides under the cover; and that the ducts rise from the ground into the body
  inside its footprint. Logs: `verification/test-before.txt`, `verification/test-after.txt`. The
  "before" run used a temporary copy of the test pointed at a copy of the kit with the original
  source, so the repository file was not swapped.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts pedestal-fiber-terminal`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 208 files, 300 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The ducts are inside the body and do
not show in the preview. The door is a plate on a solid body, not an opening; vents are dark strips,
not slots. There are no splice trays, cable slack or ground lug inside. No structural, ingress or
thermal check.
