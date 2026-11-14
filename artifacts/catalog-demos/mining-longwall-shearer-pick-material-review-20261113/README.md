# Longwall shearer cutter-pick material review

This bundle records the 2026-11-13 semantic preview review and its single correction. Five rendered mining previews were inspected; their measured envelopes, triangle counts and observations are in [preview-ledger.md](preview-ledger.md). The cutter picks on the longwall shearer were the only material mismatch found.

## Change

Both cutter-pick loops (24 vane picks and 16 face picks) now use the asset's existing `drumSteel` material control, labelled “Drum and pick steel”, instead of `steelwork` (“Conveyor and shield steel”). The source edit changes no geometry, controls, presets, triangle budget or asset count. The model remains 3,504 triangles with a 20 × 3.35 × 5.85 m envelope.

The target preview was regenerated from source and `catalog/index.json` was rebuilt. The retained index verifier found only `longwall-shearer` changed, with source SHA `8e24a41fb81dcd3ddb387738071e0207acd0c9774c1ba02401344ce547bbc1f5` and preview SHA `3934df720f7b1ff632c712d3c4e7174635f47bc4a762d7bff7bf1d5d45893a0e`.

## Demo

[Watch the 18-second before/after review](mining-longwall-shearer-pick-material-review.mp4). It shows the five-preview sample, the material assignment, full model and isolated cutter detail, then the local verification scope. The inspected source images are retained in `before/`, `after/` and `samples/`; `capture_review.py` builds the MP4 from those images. Invocation and capture settings are in [demo-settings.json](demo-settings.json).

## Verification

- Focused exported-GLB regression: 1/1 passed; all 40 cutter picks export in the `drumSteel` default color, and the test checks triangle count, envelope and existing preset values.
- Mining ESLint: clean. See `verification/eslint.log`.
- Mining mechanical quality gate: 50/50 pass (100%). This structural gate does not prove semantic realism.
- Global mechanical gate: 2,401/2,402 pass (99.96%); the single remaining thin asset is in `standard-components`, outside this change. See `verification/quality-global.log`.
- Catalog integration coverage: 53/53 files and 86/86 tests passed across retained runs. The aggregate command completed 52 files / 84 tests before receiving SIGTERM; its only remaining file, the exhaustive `catalogIndex.test.ts`, passed separately (2/2 tests, including the 2,402-asset build and index-freshness check). See `verification/catalog-suite-attempt.md` and both logs.
- Preview and index evidence: `verification/preview-render.log`, `verification/index-build.log` and `verification/index-verification.json`.

## Scope and limits

The public `https://kernelcad.com/catalog/mining/longwall-shearer/` route returned the older 224-triangle preview when checked. This branch is not deployed. The images and GLB regression demonstrate local authored catalog output only; they do not demonstrate mine-process simulation, deployed behavior or hardware acceptance.

The dated comparison against current official product references is retained privately in `kernelCAD-private/catalog-mining-longwall-shearer-picks-review-20261113/COMPARISON.md`.
