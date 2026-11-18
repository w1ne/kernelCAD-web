# Construction asphalt-distributor spray-bar material review — 2026-11-13

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline sources and renders: `source/before/`, `previews/before/`.
- Corrected source and render: `source/after/`, `previews/after/`.
- Review demo: [16-second MP4](construction-asphalt-spray-bar-material-review.mp4); source `make_demo.py`, settings `demo-settings.json`, invocation `build-demo.sh`.
- Video frame review: `video-review/`.
- Local test, lint, quality and index evidence: `verification/`. Catalog integration: 70 files / 115 tests passed (`verification/catalog-integration.txt`).

## Change

In the default `asphalt-distributor-truck` render, the rear spray bar and its nine nozzles used the
yellow equipment enamel shared by the tank and cab. They now use the existing `structuralSteelColor`
control. No geometry or parameters changed.

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts asphalt-distributor-truck
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/construction-equipment/ tests/integration/catalog/asphaltDistributorSprayBarMaterial.test.ts
npx vitest run tests/integration/catalog/asphaltDistributorSprayBarMaterial.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit construction-equipment
bash artifacts/catalog-demos/construction-asphalt-spray-bar-material-review-20261113/build-demo.sh
bash artifacts/catalog-demos/construction-asphalt-spray-bar-material-review-20261113/verification/inspect-video.sh
```

## Evidence boundary

Local source, software-rendered preview, exported-GLB colour checks and local index validation only.
The branch is not deployed. No paving process or equipment acceptance is claimed.
