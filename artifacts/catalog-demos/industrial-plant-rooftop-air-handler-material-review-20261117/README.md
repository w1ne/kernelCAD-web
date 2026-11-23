# Industrial-plant rooftop air handler material review — 17 November 2026

## Five-preview audit

The review checked five existing manufacturing/industrial previews. The full
ledger and observed follow-ups are in [`preview-review.md`](preview-review.md);
the exact sample previews and sources are under `samples/` and
`sources/reviewed/`. Open issue and PR searches found no existing target for the
five assets.

The review selected one material mismatch in
`industrial-plant/rooftop-air-handler`: the center service casing, three access
doors and fan housings all used `safetyPaint`. The casing and doors now use the
existing `steel` control. A new dark `fanHardware` control colors the three fan
housings. The safety-painted base remains distinct. This is a generic
kernelCAD scene asset, not a vendor-specific model or equipment specification.

## Before and after

- Before preview: [`before/rooftop-air-handler.png`](before/rooftop-air-handler.png)
- After preview: [`after/rooftop-air-handler.png`](after/rooftop-air-handler.png)
- Before/after source snapshots: `before/` and `after/`
- Five-preview ledger: [`preview-review.md`](preview-review.md)
- Baseline regression failure: [`verification/baseline-focused-test.txt`](verification/baseline-focused-test.txt)

The rendered geometry remains 320 triangles under the 1,400-triangle budget.
The regenerated index changes only the rooftop-air-handler row; its source hash
matches the current `.kcad.ts` source and its rendered preview path is present.
See `verification/index-diff-summary.json`.

## Verification

- The focused GLB regression passed after failing on the original source. It
  checks the steel cabinet, dark fan hardware, retained safety-painted base,
  color controls and weathered preset.
- ESLint passed for the industrial-plant kit and focused regression.
- The industrial-plant quality check reports 60/60 assets passing (100%). The
  catalog-wide mechanical quality report is 2,398/2,402 (99.83%); its four
  thin outliers remain in standard-components and are unrelated to this edit.
- `npx vitest run tests/integration/catalog/` passed: 133 files and 203 tests,
  including the full source/export/index-freshness check. Full output is in
  `verification/catalog-integration.txt`.
- `catalog/index.json` was regenerated from sources and previews; the changed
  row, SHA and preview path are recorded in `verification/`.
- Five current public detail pages returned HTTP 200 before this branch update.
  The public rooftop-air-handler preview SHA matched the old local preview.
  This PR branch is not deployed, so the live page still shows that baseline.
- The CLI render-inspection attempt attached to an already-running Chrome CDP
  session and timed out before producing an inspection bundle. The handoff
  records the command and result in
  [`verification/inspection-command.txt`](verification/inspection-command.txt).
  The committed catalog previews were rendered through the catalog software
  renderer and visually inspected.

## Demo

[Watch the local before/after MP4](industrial-plant-rooftop-air-handler-material-review.mp4).
The reproducible demo source and settings are `make_demo.py` and
`demo-settings.json`; frame/video inspection evidence is retained in
`video-review/`.

The clip shows local catalog preview rendering and a software GLB color
regression only. It is not a simulation, deployment verification, or hardware
acceptance.
