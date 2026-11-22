# Glass-crusher motor material review

This bundle records a five-preview audit and a material correction to the existing `recycling-facility/glass-crusher` asset. No catalog IDs or kits were added.

## Finding

The baseline preview showed the separate direct-coupled motor in the same blue mill enamel as the drum. The model already had a named `motor` part, but the color assignment made the drive casing blend into the mill body.

The motor now uses the existing painted-steel frame finish. The existing `stand` parameter key is retained, its control label now names the painted-steel parts it colors, and the asset keeps its four color controls and four preset names. Geometry, triangle count, envelope, budget, and asset identity are unchanged.

## Audit and evidence

- [Five-preview ledger](sample-ledger.json)
- [Open issue and PR target check](open-target-check.json)
- [Live site baseline](live-site-baseline.json) and [downloaded public source and preview hashes](live-baseline-sha256.txt)
- Before previews: [primary shredder](previews/before/primary-shredder.png), [glass crusher](previews/before/glass-crusher.png), [food-waste depackager](previews/before/food-waste-depackager.png), [eddy-current separator](previews/before/eddy-current-separator.png), [trommel screen](previews/before/recycling-trommel-screen.png)
- [Before glass-crusher preview](previews/before/glass-crusher.png) and [after glass-crusher preview](previews/after/glass-crusher.png)
- Baseline sources are in `source/before/`; the corrected source is in `source/after/`.
- [Inspected MP4 walkthrough](recycling-facility-glass-crusher-motor-material-review.mp4)
- A dated official manufacturer and CAD appearance comparison is retained in `kernelCAD-private`.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts glass-crusher
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/recycling-facility/ tests/integration/catalog/glassCrusherMotorMaterial.test.ts
npx vitest run tests/integration/catalog/glassCrusherMotorMaterial.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit recycling-facility
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-glass-crusher-motor-material-review-20261111/create_demo.py
```

`demo-settings.json` retains the video size, frame rate, render and index commands, and verification captions. The source and invocation for creating the MP4 are in `create_demo.py`.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Focused exported-GLB regression | 1 file / 1 test passed; motor and mill remain separate in exported colors; triangle count, budget, envelope, color controls and presets are retained. | [Focused regression log](verification-focused-regression.log), [test source](../../../tests/integration/catalog/glassCrusherMotorMaterial.test.ts) |
| Catalog integration suite | 31 files / 46 tests passed in 487.73 seconds. | [Catalog integration log](verification-catalog-integration.log) |
| ESLint | Clean for the recycling-facility kit and regression test. | [ESLint log](verification-eslint.log) |
| Quality gate | Recycling-facility: 153/153 (100%). Global: 2,401/2,402 (99.96%); the one unchanged outlier is `standard-components/beam-coupling`. | [Kit gate log](verification-quality-kit.log), [global gate log](verification-quality-global.log) |
| Preview and generated index | Re-rendered preview is 2,212 triangles. The regenerated index changes one asset row; `sourceSha256` matches the corrected source and `/assets/recycling-facility-glass-crusher.png` remains present. | [Preview log](verification-preview-render.log), [index build log](verification-index-build.log), [integrity log](verification-integrity.log), [before row](index-before-glass-crusher.json), [after row](index-after-glass-crusher.json) |
| Demo video | H.264, 1280×720, 20 fps, 10.4 seconds; opened and inspected audit, before, after and verification frames. | [MP4](recycling-facility-glass-crusher-motor-material-review.mp4), [inspected frames](video-review/) |

`git diff --check` is clean. The generated-index comparison changes only the glass-crusher row; there are no asset ID or kit count changes.

The preview and GLB are local kernelCAD evidence. The correction is not deployed and does not claim vendor-specific design, glass-crushing performance, equipment safety, or physical acceptance.
