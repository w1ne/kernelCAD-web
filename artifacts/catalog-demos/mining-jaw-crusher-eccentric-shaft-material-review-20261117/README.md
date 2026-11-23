# Jaw crusher eccentric-shaft material review — 17 November 2026

## Audit scope

Checked PR #1258 first: it is merged, all 17 reported CI checks succeeded, and
no submitted review is listed. The five mining previews and open issue/PR target
check are recorded in [the ledger](preview-review.md) and
[`verification/open-target-check.json`](verification/open-target-check.json).
At baseline, before this round's commit and push, open catalog PR #1507 touched
industrial-plant assets; none of the five selected mining assets was in its
changed-file set.

## Finding and correction

The baseline jaw-crusher preview reads as a primary crusher with a V-shaped jaw
chamber, drive, flywheel, raised stand, and discharge conveyor. The source bound
the eccentric shaft to `manganeseSteel`, the control intended for the fixed and
swing jaw wear liners. The shaft now uses the existing `structuralSteel`
control, while both liners remain on `manganeseSteel`.

Only the color-control assignment and the asset description changed. Asset ID,
geometry, dimensions, triangle count, four color controls, scale control, and
presets are unchanged: 3,616 triangles under the 4,500-triangle budget.

## Before and after

- [Before preview](before/jaw-crusher-module.png)
- [After preview](after/jaw-crusher-module.png)
- [Magnified eccentric-shaft color comparison](shaft-detail-before-after.png)
- [Five-preview contact sheet](preview-review-five-assets.png)
- [All five reviewed source and preview pairs](samples/)
- [Verification card](verification-card.png)
- [Review ledger](preview-review.md)

The uncropped after preview still reads as a jaw crusher. The magnified detail
shows the eccentric shaft's default finish changing from the liner palette to
the structural-steel palette; the jaws and overall silhouette remain intact.

## Verification

- The focused exported-GLB regression failed on the baseline shaft assignment
  and passed after the correction. See
  [`verification/baseline-focused-test.txt`](verification/baseline-focused-test.txt)
  and [`verification/focused-test-pass.txt`](verification/focused-test-pass.txt).
- `npx eslint catalog/kits/mining/`: **passed**.
- Mining structural quality gate: **50/50 (100%)**. Catalog-wide mechanical
  scan: **2,398/2,402 (99.83%)**; the four unchanged outliers are in
  `standard-components`. These counts do not score semantic realism.
- The catalog index was regenerated after the preview. It contains 2,402 rows
  and only the jaw-crusher row changed; its source hash matches and its preview
  path exists. Evidence: `verification/index-verification.json`.
- `npx vitest run tests/integration/catalog/`: **passed, 137 files / 207 tests**,
  including the complete source/export/index-freshness check. The recorded test
  duration was 675.63 seconds.
- The public detail page and preview returned HTTP 200. The public preview
  matches the saved checked-in baseline exactly and differs from this local
  after preview. The branch is not deployed; see
  [`verification/live-baseline.json`](verification/live-baseline.json).

## Demo

[Watch the local review demo](mining-jaw-crusher-eccentric-shaft-material-review.mp4).
Rebuild its contact sheet, detail crop and verification card with
`python3 make_review_assets.py`, then run `bash make_demo.sh`. The invocation and
capture settings are in [`demo-settings.json`](demo-settings.json); extracted
frames and metadata are in `video-review/`.

The MP4 shows local software-rendered previews and an exported-GLB regression.
It does not show simulation, deployment verification, or hardware acceptance.
