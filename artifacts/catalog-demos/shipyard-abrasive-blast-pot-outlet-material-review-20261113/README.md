# Shipyard abrasive blast-pot outlet material review — 2026-11-13

- Five-preview ledger: [preview-ledger.md](preview-ledger.md).
- Source snapshots: `source/before/` and `source/after/`.
- Rendered previews: `previews/before/` and `previews/after/`.
- Four unchanged audit samples: `samples/`.
- Local review demonstration: [18-second MP4](shipyard-abrasive-blast-pot-outlet-material-review.mp4).
- Video frames and inspection record: `video-review/`.
- Commands, checks and index evidence: `verification/`.

## Change

The rigid lower `hose-outlet` block previously used the same elastomer color as
the wheels. It now uses the existing `structuralSteel` parameter. The correction
changes material assignment only: 296 triangles, the 1.24 × 1.68 × 0.795222 m
envelope, all geometry, and all catalog IDs remain unchanged. The GLB regression
checks the outlet and both wheels retain their intended separate materials.

## Verification

- Focused exported-GLB material regression: see `verification/focused-test.log`.
- Shipyard ESLint and the full catalog integration suite: see their logs in
  `verification/`.
- Generated index audit: one changed row, matching source SHA-256, existing
  preview path, and unchanged 2,402 asset rows; see `verification/index-audit.json`.
- PR #1258 CI was green before this round; its submitted review list was empty.
- The structure-only quality gate is not a semantic realism score.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts abrasive-blast-pot
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/shipyard/
npx vitest run tests/integration/catalog/abrasiveBlastPotMaterials.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit shipyard
bash artifacts/catalog-demos/shipyard-abrasive-blast-pot-outlet-material-review-20261113/build-demo.sh
bash artifacts/catalog-demos/shipyard-abrasive-blast-pot-outlet-material-review-20261113/verification/inspect-video.sh
```

## Evidence boundary

The MP4 shows local source, software-rendered previews and local checks. It does
not show a blast-process simulation, deployed behavior, equipment rating, or
physical acceptance. A separate wheel-support geometry concern is recorded in
the preview ledger and remains outside this material correction. The branch is
not deployed, so post-deployment public-page verification is pending.
