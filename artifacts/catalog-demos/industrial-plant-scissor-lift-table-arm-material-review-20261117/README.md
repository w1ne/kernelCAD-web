# Industrial-plant scissor lift arm material review — 17 November 2026

## Review scope

The audit checked five existing manufacturing previews: plate heat exchanger,
maintenance platform, scissor lift table, burner-management skid, and mobile
tool cart. The five-preview ledger is in [`preview-review.md`](preview-review.md),
the reviewed images are in [`samples/`](samples/), and the contact sheet is
[`preview-review-five-assets.png`](preview-review-five-assets.png). The search
record for open issues and PRs is in `verification/open-target-check.json`.

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged with its
reported CI checks successful and no submitted review. At selection time, no
open issue or PR targeted the five reviewed IDs. PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507)
was the active draft catalog PR; its checks passed before this round.

## Finding and correction

The two matched `scissor-arm-b` parts used the `safetyPaint` control while their
matched `scissor-arm-a` parts used `steel`. Both arm pairs are structural links
in one scissor mechanism, so the finish split was visually misleading. Both
`scissor-arm-b` parts now use the existing `steel` control. The yellow platform
deck, scale, other material controls, presets, geometry, triangle budget and
asset ID are unchanged.

## Before and after

- Before preview and source: [`before/`](before/)
- After preview and source: [`after/`](after/)
- Reviewed source and preview for every selected asset: [`samples/`](samples/)
- Exported-GLB regression: [`verification/test-after.txt`](verification/test-after.txt)
- Baseline regression failure: [`verification/test-before.txt`](verification/test-before.txt)

## Verification

- The new GLB-level material regression fails on the original source because
  the two `scissor-arm-b` parts are assigned to `safetyPaint`; it passes after
  the correction (**1/1**).
- The default preview remains **196 triangles / 1,400 budget**. Only two color
  assignments changed.
- The preview was re-rendered and `catalog/index.json` was regenerated. The
  updated row includes the preview path and the SHA-256 of the source; the
  generated-index checks are in `verification/`.
- ESLint is clean. The industrial-plant quality check passes **60/60 (100%)**.
  The global structural scan is **2,398/2,402 (99.83%)**; its four unchanged
  exceptions are in `standard-components`.
- The full catalog integration suite passes **141 files / 211 tests**. Its
  generated-index freshness test took 615 seconds. Focused and full logs are
  retained in `verification/`.
- The dated official product/CAD comparison is recorded privately in
  `kernelCAD-private`, branch `docs/scissor-lift-table-material-review-20261117`.

The public scissor-lift detail page and preview returned HTTP 200 before this
branch update; the live preview hash matched the baseline PNG. This branch is
not deployed, so deployed behavior has not been verified after the change.

## Demo

[Watch the 14-second MP4](industrial-plant-scissor-lift-table-arm-material-review.mp4).
Recreate its contact sheet, verification card and video with `make_demo.sh`;
the invocation, settings, frame inspection and `ffprobe` evidence are retained
in `demo-settings.json` and `video-review/`.

The demo shows the local source assignment, software-rendered previews and an
exported-GLB regression. It is not simulation, deployment verification or
hardware acceptance. The asset remains a generic low-poly kernelCAD scene
object, not a lift-table specification or capacity claim.
