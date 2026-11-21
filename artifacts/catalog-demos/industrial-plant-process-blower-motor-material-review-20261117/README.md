# Industrial-plant process blower motor material review — 17 November 2026

## Review scope

Reviewed five rendered manufacturing/industrial assets: palletizer robot cell,
pressure relief valve, process blower, bucket elevator, and chemical metering
skid. The five-preview ledger is in
[`preview-review.md`](preview-review.md), with the contact sheet in
[`preview-review-five-assets.png`](preview-review-five-assets.png).

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged with all
reported CI checks successful and no submitted review. No open issue or pull
request targeted the five selected assets when checked. Exact status and search
outputs are retained in `verification/`.

## Finding and correction

The process blower's drive motor inherited the model's orange `safetyPaint`
finish. It now has a dedicated, editable `motorEnamel` color control with a dark
blue default and matching `weathered` / `highVisibility` preset values. The
base and raised discharge outlet retain `safetyPaint`; the steel housing and
all geometry remain unchanged.

The refreshed preview shows the motor in blue enamel against the gray housing,
with the orange base and outlet still distinct. The model remains at 292
triangles under its 1,400-triangle budget. This is a generic kernelCAD scene
asset, not a vendor-specific model or an engineering specification.

## Before and after

- Before render: [`previews/before/process-blower.png`](previews/before/process-blower.png)
- After render: [`previews/after/process-blower.png`](previews/after/process-blower.png)
- Before / after source snapshots: [`sources/`](sources/)
- Source snapshots for all five audited assets: [`sources/reviewed/`](sources/reviewed/)
- Exported-GLB regression result: [`verification/test-after.txt`](verification/test-after.txt)

## Verification

- Regression was red before the source correction because `motorEnamel` was
  absent, then passed after the change (1 test).
- Industrial-plant ESLint and catalog quality gate passed; the gate reports
  60/60 assets (100%).
- `npx vitest run tests/integration/catalog/` passed: 131 files and 201 tests,
  including the full catalog export and index-freshness check.
- The regenerated index changed only the `industrial-plant/process-blower` row;
  its source hash matches and the rendered preview path exists. Row evidence is
  in `verification/index-diff-summary.json`.
- The website detail page and preview returned HTTP 200 before this branch
  update. The live preview SHA matched the old local preview. This branch is not
  deployed, so the public page still shows the previous orange motor.

## Demo

[Watch the 14-second MP4](industrial-plant-process-blower-motor-material-review.mp4).
The clip shows the five-preview review, before/after render, and exported-GLB
color regression. Its source and settings are `make_demo.sh` and
`demo-settings.json`; frame inspection and `ffprobe` evidence are in
`video-review/`.

The video shows local preview rendering and a software regression only. It is
not a simulation, deployment verification, or hardware acceptance.
