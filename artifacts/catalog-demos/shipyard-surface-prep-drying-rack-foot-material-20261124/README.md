# Surface preparation drying rack — floor-pad material review (24 November 2026)

## What changed

`catalog/kits/shipyard/surface-prep-drying-rack.kcad.ts` gave the yard finish to
`upright-0` only. The other three uprights and all four tray feet were bare structural
steel, so the rendered rack showed one dark upright against three light ones and bare
floor pads.

The four tray feet are the members that rest on the dock. In the other shipyard stands
the floor members carry the yard finish (`bow-section-support-stand` base beam,
`stern-section-support-frame` bases, `hull-profile-template-rack` base runners,
`hull-block-fabrication-jig` base rails), while the frame above stays structural steel.
All four tray feet now use `yardPaint`; all four uprights, the four cross bars and the
four panel stops use `structuralSteel`.

The header comment and the meta description now describe the rack and its material
zoning. Geometry is untouched: 448 triangles against a 1,800 budget.

## Evidence

| File | Content |
|---|---|
| `preview-review.md` | Five-asset ledger, the choices and the deferred cases |
| `samples/source-change.patch` | The exact source diff |
| `samples/previews/before-surface-prep-drying-rack.png` | Render at the audit base commit |
| `samples/previews/after-surface-prep-drying-rack.png` | Render after the correction |
| `verification/vitest-after.txt` | New regression test passes |
| `verification/vitest-before-fails.txt` | Same test fails on the pre-fix source |
| `verification/eslint.txt` | ESLint on the kit and the new test |
| `verification/catalog-quality-shipyard.txt` | Shipyard quality gate, 70/70 |
| `verification/catalog-suite.txt` | Full catalog integration suite, 223 files / 375 tests |
| `video-review/frame-1.0.png`, `frame-4.5.png` | Frames read back from the encoded video |
| `review-demo.mp4` | Before, after and the regression result |

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts surface-prep-drying-rack
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/surfacePrepDryingRackMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit shipyard
npx eslint catalog/kits/shipyard/ tests/integration/catalog/surfacePrepDryingRackMaterial.test.ts
python3 artifacts/catalog-demos/shipyard-surface-prep-drying-rack-foot-material-20261124/make_demo.py
```

## Claims

The previews are local software renders of the exported low-poly GLB at default knobs.
The video shows local sources, those renders and the GLB colour regression. It makes no
claim about simulation, deployment, load capacity, compliance or hardware acceptance.
