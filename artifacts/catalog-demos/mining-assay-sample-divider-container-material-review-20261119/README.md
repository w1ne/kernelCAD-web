# Mining assay sample divider material review — 19 November 2026

This five-preview semantic audit selected one supported material mismatch in
`mining/assay-sample-divider`. Its eight open collection buckets used the
plastic finish, while the adjacent carousel and feed surfaces used stainless
steel. The buckets now use the existing `stainlessSteel` control; the sample
ore remains separate. This is a material assignment change only: geometry,
catalog envelope, triangle budget, preset names, divider choice and bucket-count
choice are unchanged.

The [five-preview ledger](preview-review.md) records the object and material
checks for the target plus `core-tray-rack`, `mine-refuge-chamber`,
`mine-survey-tripod` and `mine-ventilation-fan`. Four other previews had no
supported mismatch. The [before](before/assay-sample-divider.png) and
[after](after/assay-sample-divider.png) software renders show the sample
buckets moving from the pale plastic finish to the existing stainless palette.

## Baseline and overlap checks

- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged with
  all 17 recorded checks successful and no submitted review.
- Active catalog PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507)
  was checked at matching pre-sample head `597aa8bfd`: it was a draft, its
  applicable recorded checks passed, it had no submitted review and GitHub
  reported `BLOCKED` merge state.
- All five assets were clear of exact open issue/PR target overlap and the
  known fix branches #1298, #1305, #1307 and #1308. The full results are in
  [`verification/open-target-check.json`](verification/open-target-check.json).
- Before the change, all five public pages, source files and preview routes
  returned HTTP 200. Public source and preview hashes matched the local
  baseline and generated index rows. See
  [`live-baseline/public-check.json`](live-baseline/public-check.json).

## Verification

- The focused exported-GLB regression failed against the original `jarPlastic`
  assignment and passed after the correction: **1/1**.
- ESLint passed for the full mining kit and the new regression.
- The full catalog integration suite passed: **161 files / 231 tests**, including
  the exhaustive source/export/index freshness check.
- The mining quality scan passes **50/50 (100%)**. The global scan reports
  **2,398/2,402 (99.83%)**; the four unchanged below-gate assets are in
  `standard-components`.
- The generated index remains **2,402 assets / 50 kits**. The target row's
  `sourceSha256` matches its current source, its preview path exists, and its
  triangle count and bounds match the baseline. The four other sampled rows
  remain unchanged; see [`verification/index-row-check.json`](verification/index-row-check.json).
- The target preview was re-rendered. Three post-render previews were opened:
  the assay divider, core tray rack and ventilation fan; each remains
  recognizable in color. The MP4 is in [`review-demo.mp4`](review-demo.mp4),
  with settings, source, invocation and extracted-frame inspection in this
  bundle.

The dated official-reference comparison is retained privately. This branch is
not deployed, so the public page remains at its
captured pre-change baseline. The MP4 documents local source, software-rendered
preview and GLB regression only; it does not claim deployment, simulation,
equipment performance or hardware acceptance.
