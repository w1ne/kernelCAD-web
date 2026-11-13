# Airfield pushback-tug cradle material review — 2026-11-13

- Five-preview ledger: [preview-ledger.md](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`.
- Four unchanged audit samples: `samples/`.
- Local review demonstration: [18-second MP4](airfield-pushback-tug-cradle-material-review.mp4).
- Video frames and inspection record: `video-review/`.
- Commands, checks and index evidence: `verification/`.

## Change

The rigid front `nose-wheel-cradle` plate previously used the `rubber` colour of
the four tyres. It now uses the existing `stainlessSteel` control, the same metal
control as the chassis and tow bar. The correction changes material assignment
only: 272 triangles, the 0.5784 × 0.1798 × 0.3072 m envelope, all geometry and
all catalog IDs remain unchanged. The GLB regression checks that the cradle
exports in steel and that only the four tyres use rubber. The same test fails
on the previous source (`verification/focused-test-before-source.log`).

## Verification

- Focused exported-GLB material regression: `verification/focused-test.log`.
- Airfield ESLint: `verification/eslint.log` (no findings).
- Full catalog integration suite: `verification/catalog-suite.log`.
- Generated index audit: one changed row, matching source SHA-256, existing
  preview path and 2,402 unchanged asset rows; see `verification/index-audit.json`.
- PR #1258 CI was green before this round; it had no submitted reviews.
- The structure-only quality gate is not a semantic realism score.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts pushback-tug
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/airfield/
npx vitest run tests/integration/catalog/pushbackTugMaterials.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit airfield
bash artifacts/catalog-demos/airfield-pushback-tug-cradle-material-review-20261113/build-demo.sh
bash artifacts/catalog-demos/airfield-pushback-tug-cradle-material-review-20261113/verification/inspect-video.sh
```

## Evidence boundary

The MP4 shows local source, software-rendered previews and local checks. It does
not show a towing simulation, deployed behaviour, equipment rating or physical
acceptance. The weak two-box silhouette and the scene-scale dimensions are
recorded in the ledger and remain outside this material correction. The branch
is not deployed, so post-deployment public-page verification is pending.
