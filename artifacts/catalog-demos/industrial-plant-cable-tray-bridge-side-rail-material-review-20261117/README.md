# Cable tray bridge side-rail material review — 17 November 2026

## Finding

The five-preview audit found that `industrial-plant/cable-tray-bridge` used the
safety-paint control for both long cable-tray rails while the eight crossbars
and supporting uprights used structural steel. The rails and crossbars form
one tray assembly, so both rails now use the existing `steel` control. The
support feet retain safety paint. No new parameter or asset ID was added.

The model remains 168 triangles under its 1,400-triangle budget, with the same
0.94 × 0.341 × 0.39 m envelope. The rerender reads as a steel ladder tray on
two steel uprights, with orange support feet. The [five-preview audit ledger](preview-review.md)
records all selected previews and dispositions.

## Evidence

- [Before preview](before/cable-tray-bridge.png) · [after preview](after-cable-tray-bridge.png)
- Before source: [baseline](before/cable-tray-bridge.kcad.ts) · after source: [corrected model](after-cable-tray-bridge.kcad.ts)
- All five reviewed images and source snapshots: [`samples/`](samples/) and [`sources/reviewed/`](sources/reviewed/)
- [Focused GLB color regression](../../../tests/integration/catalog/cableTrayBridgeMaterial.test.ts)
- [Local workflow and result MP4](industrial-plant-cable-tray-bridge-side-rail-material-review.mp4) · [settings](demo-settings.json)
- [Decoded-frame contact sheet](video-review/contact-sheet.png) · [inspection record](video-review/inspection.md)
- [Preview render](verification/preview-render.txt) · [index build](verification/index-build.txt) · [verification commands and results](verification/)

The regression failed on the baseline because `side-rail--1` resolved to safety
paint. It passes after the correction, checks both rails against the steel
color, checks a tray rung against the same color, and confirms a support foot
retains safety paint.

The quality gate reports industrial-plant 60/60 (100%) and the full catalog
2,398/2,402 (99.83%). Four unrelated `standard-components` assets account for
the global failures; this finish correction does not change that result.

ESLint passed for the industrial-plant kit and the new regression. The focused
test passed 1/1, and the full catalog integration suite passed 145 files / 215
tests, including the 2,402-asset source/export/index-freshness check.

PR #1258 was merged with all 17 reported CI checks successful and no formal
review entries. At selection time the active catalog PR was #1507; its current
checks were successful and it had no submitted review. Neither open issues nor
the open PR source diff targeted the five sampled IDs; the recorded queries
and status are in `verification/open-target-check.json`.

The current public detail page and preview returned HTTP 200 before this branch
change; the live PNG hash matched the checked-in baseline. This branch is not
deployed. The MP4 shows local source evaluation, preview rendering and a
software regression only. It is not a simulation, deployment verification or
hardware acceptance.
