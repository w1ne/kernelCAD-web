# Grit classifier semantic review

This handoff records one local semantic correction found while reviewing five
water-treatment previews. Four sampled assets showed plausible material zones.
`grit-classifier` had no extraction screw, the feature that distinguishes it from
a generic trough. The correction adds an open settling trough, inclined helical
screw, raised chute, coaxial drive, and support legs.

No material mismatch was found in this five-asset sample. The change addresses a
missing physical feature and false visual implication in the original asset; it
does not claim a material correction.

## Review files

- `previews/before.png` and `previews/after.png`: inspected checked-in catalog
  renders, before and after the local source change.
- `demo.mp4`: 8-second, 1280×720 still-frame comparison with explicit local
  preview and non-acceptance captions. Inspect the rendered cards and video before
  re-running it.
- `source/`: exact before and after `.kcad.ts` source copies.
- `render-settings.json`, `create-demo.sh`: render and video invocation/settings.
- `verification/`: index build, lint, focused and full integration test logs,
  generated index row, SHA-256 manifest, video metadata, and visual inspection.
- `open-target-check-output.txt` and `verification/open-target-audit.md`: exact
  issue/PR searches and overlap result. The GitHub API path query hit a rate
  limit, then the public diffs for all 18 open PRs were checked directly; none
  touched a sampled source or preview path.
- `verify-open-pr-paths.sh`: source for the completed public diff check.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts grit-classifier
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/water-treatment/ tests/integration/catalog/gritClassifierFidelity.test.ts
npx vitest run tests/integration/catalog/gritClassifierFidelity.test.ts
npx vitest run tests/integration/catalog/
```

Rebuild the video from this directory with `bash create-demo.sh`.

The private dated official-product comparison is stored in
`kernelCAD-private/docs/competitors/2026-11-11-water-treatment-grit-classifier-semantic-review.md`.

The modified source, preview, test, and catalog index are local repository
artifacts until published. No deployment or treatment-performance, vendor
dimension, equipment-safety, or physical acceptance is claimed.
