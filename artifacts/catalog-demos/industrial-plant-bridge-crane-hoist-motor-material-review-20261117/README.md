# Industrial-plant bridge crane hoist motor material review — 17 November 2026

## Review scope

Reviewed five rendered manufacturing assets: forklift truck, centrifugal
pump, distillation column, industrial boiler, and bridge crane. The five-preview
ledger is in [`preview-review.md`](preview-review.md), with exact source
previews in [`samples/`](samples/) and the contact sheet in
[`preview-review-five-assets.png`](preview-review-five-assets.png).

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged with all
reported CI checks successful and no submitted review before this audit. At
candidate-selection time, before this change was pushed, no open issue or PR
targeted the five selected asset IDs; the search record and check source are in
`verification/open-target-check.json` and `check_open_targets.py`.

## Finding and correction

The bridge crane's `hoist-motor` was assigned to the yellow `girder` color
control, although the same model already has a separate `hoist` control for
hoisting machinery. The motor now uses that existing hoist control. The bridge
girders retain the yellow finish; no geometry, dimensions, knobs, presets or
triangle budget changed. The asset remains a generic kernelCAD scene object,
not a vendor-specific crane or engineering specification.

## Before and after

- Before render: [`previews/before/bridge-crane.png`](previews/before/bridge-crane.png)
- After render: [`previews/after/bridge-crane.png`](previews/after/bridge-crane.png)
- Before / after source snapshots: [`sources/`](sources/)
- Source snapshots for all five audited assets: [`sources/reviewed/`](sources/reviewed/)
- Exported-GLB regression result: [`verification/test-after.txt`](verification/test-after.txt)

## Verification

- The exported-GLB regression failed on the baseline because `hoist-motor` was
  in the `girder` palette, then passed after the correction (1 test).
- The refreshed software preview shows the hoist motor in the hoist machinery
  finish; bridge girders remain yellow.
- The asset remains at 4,104 triangles under its 6,000-triangle budget.
- The mechanical catalog quality gate reports 2,398/2,402 assets passing
  (99.83%); the four unchanged exceptions are in `standard-components`.
- The catalog index was regenerated from sources. Index row and freshness
  evidence are in `verification/index-diff-summary.json`.
- Public detail page and preview returned HTTP 200 before this branch update;
  the public preview matched the previous local preview byte-for-byte. This
  branch is not deployed, so the website still shows the yellow motor.

## Demo

[Watch the 14-second MP4](industrial-plant-bridge-crane-hoist-motor-material-review.mp4).
Its source and settings are `make_demo.sh`, `make_review_assets.py`, and
`demo-settings.json`; frame inspection and `ffprobe` evidence are in
`video-review/`.

The video shows local preview rendering and a software regression only. It is
not a simulation, deployment verification, or hardware acceptance.
