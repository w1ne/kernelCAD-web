# Vertical turbine pump motor finish review — 27 November 2026

**Demo:** [15-second local MP4](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before/after previews](before/vertical-turbine-pump.png) → [after](after/vertical-turbine-pump.png)

This review corrects one material assignment in the existing
`water-treatment/vertical-turbine-pump` asset. Its six motor cooling ribs now
use the existing `motorFinish` parameter with the motor housing, fan cowl, and
terminal box. Geometry, dimensions, parameters, presets, triangle budget, and
asset identity are unchanged; the mesh remains at 2,276 triangles.

## Sample and finding

Five industrial/manufacturing previews were opened and checked for recognizable
silhouette, visible physical features, material roles, dimensions, and labels.
Four had no selected mismatch. In the vertical turbine pump head, the six motor
ribs followed `structuralSteel` while the rest of the motor followed
`motorFinish`. The ledger records the findings and generated envelopes; those
envelopes are not vendor-verified dimensions.

Before editing, the five live detail/source/preview routes returned HTTP 200 and
matched the captured local baseline hashes. The selected IDs and paths were
clear of open issue/PR targets and the known fix PR paths. See
[`preview-review.md`](preview-review.md),
[`verification/open-target-check.json`](verification/open-target-check.json),
and [`live-baseline/public-check.json`](live-baseline/public-check.json).

## Verification

- The exported-GLB regression fails against the baseline source and passes after
  the correction (1/1). It checks the exported colors and palette membership of
  all motor parts, the current parameter and preset, and the triangle budget.
- Water-treatment ESLint is clean. Its material/preset quality gate reports
  50/50 assets (100%). The global gate reports 2,396/2,402 (99.75%); the six
  unchanged outliers are recorded under `verification/`.
- The target preview was rendered again and the generated catalog index was
  rebuilt. The index still contains 2,402 assets across 50 kits; only the
  target row's palette and source SHA changed. Its hash matches the source and
  its preview path exists.
- `npx vitest run tests/integration/catalog/` passed **229/229 files and
  384/384 tests**, including exhaustive source, export, triangle-budget and
  index freshness checks. Full output is in
  [`verification/catalog-integration-tests-final.txt`](verification/catalog-integration-tests-final.txt).
  The first run exposed a missing Playwright Chromium runtime; the attempt and
  the failed connection to an existing CDP session are retained in
  `verification/catalog-integration-tests.txt` and
  `verification/cdp-render-tests.txt`. After installing the supported
  Playwright runtime, the two affected preview tests and the full suite passed.

The [before/after sources and previews](before/) and [after index row](after/)
retain the implementation evidence. The exact commands, render settings,
captured public baseline, sample snapshots, and verification logs are preserved
in this bundle.

## Demo and deployment status

Recreate the video with [`make_demo.py`](make_demo.py). Canvas, duration, codec,
and provenance are recorded in [`demo-settings.json`](demo-settings.json); the
invocation is in [`verification/commands.txt`](verification/commands.txt).
Extracted frames and inspection notes are in [`video-review/`](video-review/).
The clip shows local source renders and software checks. It does not show
deployment, equipment performance, process simulation, or hardware acceptance.

The public site remains at the pre-edit baseline because this branch is not
deployed. This review records native kernelCAD asset behavior only; the dated
official product comparison is retained in the private repository.
