# Recycling facility glass-screening motor-cap material review — 2026-11-13

- Five-preview audit ledger: [preview-ledger.md](preview-ledger.md).
- Baseline source snapshots and renders: `source/before/` and `previews/before/`.
- Corrected source and render: `source/after/` and `previews/after/`.
- Four unchanged audit samples are in `previews/before/`; the target before/after renders are also in `samples/` and `previews/`.
- Review demo: [16-second MP4](recycling-glass-screening-motor-cap-material-review.mp4).
- Demo source, settings and invocation: `make_demo.py`, `demo-settings.json`, `build-demo.sh`.
- Video frame review: `video-review/`.
- Local test, lint, quality, catalog-index and integration evidence: `verification/`.

## Change

The default `glass-screening-deck` render used the orange polyurethane screen-panel
control on both motor end caps. The caps now share the existing dark finish used
by the motor bodies. The screen panels remain orange. No geometry or parameters
changed: the mesh stays at 2,016 triangles under its 2,800-triangle budget, with
the same 5.975 × 2.9 × 3.945 m default envelope, four material controls and four
presets.

The original source already described these parts as two unbalanced motors and
polyurethane panels. The correction follows that source material zoning; no
vendor model or dimensions were copied.

## Verification

- The focused exported-GLB regression failed against the saved baseline because
  `motor-cap-f` and `motor-cap-b` were in the `panels` palette. It passes after
  the correction and checks exported cap/body/panel colors, palette mapping,
  triangle count, budget and envelope.
- Index audit: 2,402 rows before and after; the recycling-facility structural
  gate passes 153/153 assets (100%). Exactly one row changed, with matching
  source SHA-256 and an existing preview path; see `verification/index-audit.json`.
- `verification/` retains the kit ESLint result and catalog integration run.
- Full catalog integration: 69 files / 114 tests passed, including the exhaustive
  2,402-row source/export/index freshness check.
- PR #1258 was green at baseline head `a8588e6d8` before this round. No review
  had been submitted. The pushed commit receives its own CI run.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts glass-screening-deck
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/recycling-facility/ tests/integration/catalog/glassScreeningDeckMotorCapMaterial.test.ts
npx vitest run tests/integration/catalog/glassScreeningDeckMotorCapMaterial.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit recycling-facility
bash artifacts/catalog-demos/recycling-glass-screening-motor-cap-material-review-20261113/build-demo.sh
bash artifacts/catalog-demos/recycling-glass-screening-motor-cap-material-review-20261113/verification/inspect-video.sh
```

## Evidence boundary

The MP4 and checks show local kernelCAD source, software-rendered catalog preview,
exported-GLB material checks, and local index validation. The branch is not
deployed. No process simulation, equipment rating, or hardware acceptance is
claimed.
