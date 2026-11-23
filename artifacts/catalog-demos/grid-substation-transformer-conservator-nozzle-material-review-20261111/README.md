# Grid-substation transformer conservator nozzle review

This bundle records a five-preview semantic audit and one correction to the existing `substation-transformer-conservator` asset. It contains the baseline previews and source snapshots, the after preview and source, the audit ledger, open-target checks, regression output, regenerated index evidence, and a short local MP4 walkthrough.

## Audit result

The copper-colored top nozzle was separated from the painted steel vessel in the baseline preview. The source also placed the nozzle above the vessel roof with a 245 mm gap. It now has a painted flange that overlaps the roof by 10 mm and a hollow neck joined to the flange. Both use the existing `transformerEnamel` material. The model increases from 116 to 244 triangles, within its 1,800-triangle budget; its envelope is 1.918 × 1.395 × 0.792 m. It has three material controls and keeps both existing preset names.

Four other samples had coherent visible material zones. The surge arrester still shows a detached terminal block; that separate geometry concern is recorded in [`sample-ledger.json`](sample-ledger.json) and was not part of this material correction.

## Evidence

- [Five-preview audit ledger](sample-ledger.json)
- [Open issue and PR check](open-target-check.json)
- Baseline samples: [main transformer](previews/before/substation-main-power-transformer.png), [surge arrester](previews/before/substation-surge-arrester.png), [radiator bank](previews/before/substation-transformer-radiator-bank.png), [live-tank breaker](previews/before/substation-live-tank-breaker.png), [conservator](previews/before/substation-transformer-conservator.png)
- [Before preview](previews/before/substation-transformer-conservator.png)
- [After preview](previews/after/substation-transformer-conservator.png)
- [Before source](source/before/substation-transformer-conservator.kcad.ts)
- [After source](source/after/substation-transformer-conservator.kcad.ts)
- [Inspected MP4 walkthrough](grid-substation-transformer-conservator-nozzle-material-review.mp4)

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts substation-transformer-conservator
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/grid-substation/ tests/integration/catalog/substationConservatorNozzleMaterials.test.ts
npx vitest run tests/integration/catalog/substationConservatorNozzleMaterials.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit grid-substation
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-transformer-conservator-nozzle-material-review-20261111/create_demo.py
```

The catalog-wide quality command exits nonzero for its existing `standard-components/beam-coupling` outlier; the recorded result is 2,401/2,402 (99.96%). Command output is retained in the adjacent `verification-*.log` files.

The focused GLB regression passes 1/1, and the catalog integration suite passes 30 files / 45 tests, including catalog-index freshness. ESLint is clean; grid-substation passes 80/80 (100%). The regenerated index row has the current source SHA-256 and still points to the rendered preview.

The MP4 is a local source-to-preview walkthrough, not a deployed browser capture, transformer simulation, design approval, or physical acceptance.
