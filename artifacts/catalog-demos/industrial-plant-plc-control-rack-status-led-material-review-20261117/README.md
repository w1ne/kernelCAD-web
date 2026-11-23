# Industrial-plant PLC rack status LED material review — 17 November 2026

## Audit scope

Reviewed five rendered `industrial-plant` previews. PR #1258 was checked first:
it is merged, its 17 reported CI checks all succeeded, and no review was
submitted. The current open PR #1507 targets nine other industrial-plant source
assets; its required checks succeeded and its optional reference/ledger/index/
geometry/test-shard/external-tools jobs were skipped. No open issue or pull
request targets any of the five sampled IDs. The target and exclusion evidence
is in [open-target-check.json](verification/open-target-check.json).

The [preview ledger](preview-review.md) records each observation. The first two
assets had not appeared in an earlier preview-review ledger. The live public
detail pages returned HTTP 200 and the five public PNG hashes matched their
local baseline previews before editing. The PLC route still serves its baseline
image because this branch is not deployed. The captured public pages and PNGs are in
[`verification/live-baseline/`](verification/live-baseline/).

## Finding and correction

The `plc-control-rack` preview showed all 21 channel/RUN/ERROR indicator blocks
in safety yellow, with one of seven otherwise matching module housings yellow
as well. The correction gives all seven module housings and the rack supports a
steel finish, then exposes separate green channel, green RUN, and red ERROR
indicator-lens controls. `weathered` and `highVisibility` presets carry those
colors. Geometry, dimensions, triangle count, asset identity, and budget are
unchanged: 384 triangles under the 1,400-triangle budget.

The dated manufacturer comparison is retained privately in
`kernelCAD-private/catalog-industrial-plant-20261102/`. The public source and
handoff describe only the generic native kernelCAD model; they do not claim a
vendor-specific design or controller simulation.

## Before and after

- [Before preview](before/plc-control-rack.png)
- [After preview](after/plc-control-rack.png)
- [Before source](before/plc-control-rack.kcad.ts)
- [After source](after/plc-control-rack.kcad.ts)
- [Five-preview contact sheet](preview-review-five-assets.png)
- [All five reviewed source/preview pairs](samples/)

The after preview has a gray steel rack and cards with small green channel/RUN
points and red ERROR points. The rows remain visible and the model is centered.

## Verification

- The focused exported-GLB regression failed on the baseline, then passed after
  the material correction. It checks the four color controls, preset values,
  all 21 LED nodes, all seven card housings, the rack supports, and the 384
  triangle count. Logs: `verification/baseline-focused-test.txt` and
  `verification/focused-test-pass.txt`.
- Index generation and the one-row source-hash/preview-path audit are recorded
  in `verification/index-build.txt` and `verification/index-verification.json`.
- ESLint is clean. The industrial-plant structural quality gate passes 60/60
  (100%). The global scan reports 2,398/2,402 (99.83%); its four non-passing
  rows are in `standard-components`, which this change does not touch. These
  mechanical scores do not certify semantic realism.
- `npx vitest run tests/integration/catalog/` passed: 135/135 files and
  205/205 tests. The full 2,402-asset catalog/index freshness test took about
  10 minutes. The complete runner output is in
  [`verification/catalog-integration-tests.txt`](verification/catalog-integration-tests.txt).
- `kernelcad render inspect` was attempted through two already-running Chrome
  CDP sessions; both connections timed out after WebSocket connection. The
  CLI required CDP attachment, so it did not launch a new browser. No inspection
  bundle was produced; the attempts and fallback evidence are recorded in
  [`verification/render-inspect-status.json`](verification/render-inspect-status.json).
  The named catalog software preview, five-preview sheet, and MP4 frames were
  visually inspected instead.
- The current public asset page still serves the baseline image because this
  branch is not deployed. This change has not been deployed or hardware-tested.

## Demo

[Watch the 14-second MP4](industrial-plant-plc-control-rack-status-led-material-review.mp4).
Rebuild the contact sheet/result card with `python3 make_review_assets.py`, and
the video with `./make_demo.sh`. Settings and codec are in
[`demo-settings.json`](demo-settings.json); fixed-frame verification is in
[`video-review/inspection.json`](video-review/inspection.json).

The clip shows local catalog preview rendering and an exported-GLB software
regression only. It does not show simulation, deployment verification, or
hardware acceptance.
