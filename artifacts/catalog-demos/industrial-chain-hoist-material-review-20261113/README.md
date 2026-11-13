# Electric chain-hoist material review — 2026-11-13

**Asset:** `industrial-plant/electric-chain-hoist`  
**Demo:** [18-second local source and preview review](industrial-chain-hoist-material-review.mp4)  
**Audit ledger:** [five-preview review](preview-ledger.md) · [MP4 frame inspection](video-review/README.md)

## Change

The rendered load-chain segment was safety yellow even though it is a metal chain.
The source now assigns `chain` to the existing `steel` control. No geometry,
dimensions, controls, presets, triangle budget, or catalog identifiers changed.
The generated asset remains 192 triangles within its 1,400-triangle budget, with a
0.448 × 0.441 × 0.25 m envelope.

The after preview confirms the exposed chain segment is gray. The complete assembly
still reads as a box below a plate rather than a recognizable chain hoist; this
color-only correction does not resolve that separate silhouette weakness, which is
recorded in the audit ledger.

## Verification

- Focused exported-GLB regression: **1/1 passed**. It checks the chain's steel palette
  membership and exported color, and confirms the unchanged triangle count, budget,
  and envelope. See [test source](../../../tests/integration/catalog/electricChainHoistMaterials.test.ts)
  and [focused test output](verification/focused-test.log).
- Industrial-plant ESLint: **passed**; [log](verification/eslint.log).
- Full catalog integration: **55 files / 88 tests passed**. See the retained
  [complete run log](verification/catalog-integration.log).
- Industrial-plant structural quality: **60/60 (100%)**. The global structural scan
  is **2,401/2,402 (99.96%)**; its unchanged outlier is
  `standard-components/beam-coupling`. See the [industrial-plant](verification/quality-industrial-plant.log)
  and [catalog-wide](verification/quality-global.log) outputs.
- Index audit: **2,402 assets / 50 kits**, only `electric-chain-hoist` changed, zero
  source-SHA mismatches, and zero missing local preview files. See
  [index verification](verification/index-audit.json) and its [recheck script](verification/verify-index.mjs).
- The generated preview and the [before/after images](previews/) are retained.
- The [open-target search](verification/open-target-search.txt) found no open issue
  specifically for this asset; PR #1258 is the existing umbrella catalog PR.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts electric-chain-hoist
npx tsx scripts/buildAssetCatalog.ts
node artifacts/catalog-demos/industrial-chain-hoist-material-review-20261113/verification/verify-index.mjs
npx eslint catalog/kits/industrial-plant/
npx vitest run tests/integration/catalog/electricChainHoistMaterials.test.ts
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
bash artifacts/catalog-demos/industrial-chain-hoist-material-review-20261113/build-demo.sh
```

The five reviewed source snapshots, previews, and samples are retained beside the
video. `demo-settings.json` and `build-demo.sh` record its capture layout and exact
invocation. The dated official-material comparison is stored privately at
`kernelCAD-private/catalog-industrial-chain-hoist-material-review-20261113/COMPARISON.md`.

## Evidence boundary

The MP4 shows local kernelCAD source, a local software-rendered preview, and local
verification. The branch is not deployed. The baseline check found HTTP 200 for the
[public detail page](https://kernelcad.com/catalog/industrial-plant/electric-chain-hoist/)
and a preview hash matching the before image; this is not a post-deploy check. The
model is a visualization prop. This work establishes no load rating, engineering
dimensions, hoisting performance, manufacturing suitability, simulation result,
deployed behavior, or physical acceptance.
