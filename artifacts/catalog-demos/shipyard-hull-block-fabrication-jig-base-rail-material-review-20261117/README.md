# Shipyard hull-block jig material review — 17 November 2026

## Audit scope

PR #1258 was checked before sampling: merged with all 17 reported CI checks
successful and no submitted review. The current catalog PR at audit time was
#1507; its changed assets did not overlap the five selected shipyard items. The
five asset IDs and open issue/PR check are in
[`preview-review.md`](preview-review.md) and
[`verification/open-target-check.json`](verification/open-target-check.json).

Reviewed `caisson-ballast-manifold-stand`, `electrical-test-cart`,
`hull-block-fabrication-jig`, `dock-gate-caisson`, and `ship-lift-cradle` from
their rendered previews before changing source. Their source and preview
snapshots are retained in [`samples/`](samples/).

## Finding and correction

The two matching long base rails on `hull-block-fabrication-jig` had different
finishes: `base-rail-0` used `yardPaint` (`#657c78`) while `base-rail-1` used
`structuralSteel` (`#b6c1c4`). The second rail now uses the existing `yardPaint`
control. The cross rails, towers, and alignment beams remain structural steel.

Only one material mapping changed. Silhouette, dimensions (2.70 × 1.77 × 2.30
m), presets, triangle budget (1,800), and default mesh (420 triangles) are
unchanged. The preview is a native kernelCAD fixture model; it does not claim a
specific manufacturer's product or a universal shipyard coating standard.

## Before and after

- [Before preview](before/hull-block-fabrication-jig.png)
- [After preview](after/hull-block-fabrication-jig.png)
- [Five-preview contact sheet](samples/five-preview-contact-sheet.png)
- [Review ledger](preview-review.md)
- [Rendered MP4 demo](shipyard-hull-block-jig-base-rail-material-review.mp4)
- [Inspected video frames and notes](video-review/inspection.md)
- [Source mapping card](source-mapping.png)
- [Local verification card](verification-card.png)

The MP4 shows the five selected previews, the baseline, the one source mapping
change, the after preview, and local verification. It is a software-preview
review and does not show simulation, deployment, or hardware acceptance.

## Verification

- The focused exported-GLB regression failed against the baseline material
  assignment and passed after the correction. Results:
  [`baseline-test.txt`](verification/baseline-test.txt) and
  [`focused-test.txt`](verification/focused-test.txt).
- `npx eslint catalog/kits/shipyard/ tests/integration/catalog/hullBlockFabricationJigBaseRailMaterial.test.ts`:
  **passed** ([log](verification/eslint.txt)).
- Shipyard structural quality gate: **70/70 (100%)**. Catalog-wide mechanical
  scan: **2,398/2,402 (99.83%)**; four unchanged outliers are in
  `standard-components`. Neither mechanical result establishes semantic
  realism. Logs: [`quality-shipyard.txt`](verification/quality-shipyard.txt)
  and [`quality-global.txt`](verification/quality-global.txt).
- The preview was regenerated before the index. The generated index has 2,402
  assets; only the jig row changed. Its source hash matches and its preview
  path exists ([index evidence](verification/index-check.json)).
- `npx vitest run tests/integration/catalog/`: **passed, 139 files / 209
tests**, including the complete 2,402-asset source/export/index-freshness check.
The long index test took 717.65 seconds; full-suite output is retained in
[`catalog-integration-tests.txt`](verification/catalog-integration-tests.txt).
- Before/after PNG previews and all five sampled renders were opened and
  visually reviewed. The canonical `render inspect` CLI bundle was not
  produced because attachment to the already-running Chrome CDP session timed
  out. No second browser was launched; the direct PNG visual inspection and
  this limitation are recorded in
  [`render-inspect-status.md`](verification/render-inspect-status.md).

Official comparable appearance workflows and shipbuilding fixture context were
reviewed and recorded privately in `kernelCAD-private`, dated 2026-11-17. Those
sources informed this audit; the public model remains native kernelCAD content.

## Rebuild

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts hull-block-fabrication-jig
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/shipyard/ tests/integration/catalog/hullBlockFabricationJigBaseRailMaterial.test.ts
npx vitest run tests/integration/catalog/hullBlockFabricationJigBaseRailMaterial.test.ts
python3 artifacts/catalog-demos/shipyard-hull-block-fabrication-jig-base-rail-material-review-20261117/create_demo.py
bash artifacts/catalog-demos/shipyard-hull-block-fabrication-jig-base-rail-material-review-20261117/make_demo.sh
```

Video dimensions, codec, frame rate, slide timing, source files, and captions
are retained in [`demo-settings.json`](demo-settings.json). The checked-in MP4
was decoded and all five slides visually inspected.
