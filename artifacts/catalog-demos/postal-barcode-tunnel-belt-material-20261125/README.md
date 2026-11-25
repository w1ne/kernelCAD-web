# Barcode tunnel scanner — belt material review (25 November 2026)

## What changed

`catalog/kits/postal-logistics/barcode-tunnel-scanner.kcad.ts` coloured the carrying
belt with `paintedSteel`, the same control as the arch walls and roof. The belt rendered
as a blue-grey steel floor, turned orange with the arch in the `highVisibility` preset,
and the asset had no rubber control while every sibling conveyor belt in the kit is dark
rubber.

The belt now has its own material control, `beltRubber` (default #2c3134), set by both
presets. The arch walls and roof keep `paintedSteel`, the legs `structuralSteel`, the
scan heads `stainlessSteel` and the side windows `instrumentGlass`. The header comment
and the meta description now describe the tunnel and its five material zones. Geometry
is untouched: 720 triangles against a 1,800 budget.

## Evidence

| File | Content |
|---|---|
| `preview-review.md` | Five-asset ledger, the choices and the checked-and-cleared cases |
| `samples/source-change.patch` | The exact source diff |
| `samples/previews/before-barcode-tunnel-scanner.png` | Render at the audit base commit |
| `samples/previews/after-barcode-tunnel-scanner.png` | Render after the correction |
| `verification/vitest-after.txt` | New regression test passes |
| `verification/vitest-before-fails.txt` | Same test fails on the pre-fix source |
| `verification/eslint.txt` | ESLint on the kit and the new test |
| `verification/catalog-quality-postal.txt` | Postal-logistics quality gate, 52/52 |
| `verification/catalog-suite.txt` | Full catalog integration suite; one unrelated load timeout that passes alone |
| `video-review/frame-1.0.png`, `frame-4.5.png` | Frames read back from the encoded video (local review only; gitignored) |
| `review-demo.mp4` | Before, after and the regression result |

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts barcode-tunnel-scanner
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/barcodeTunnelScannerBeltMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit postal-logistics
npx eslint catalog/kits/postal-logistics/ tests/integration/catalog/barcodeTunnelScannerBeltMaterial.test.ts
python3 artifacts/catalog-demos/postal-barcode-tunnel-belt-material-20261125/make_demo.py
```

## Claims

The previews are local software renders of the exported low-poly GLB at default knobs.
The video shows local sources, those renders and the GLB colour regression. It makes no
claim about simulation, deployment, scan accuracy, throughput, compliance or hardware
acceptance.
