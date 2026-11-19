# Recycling transfer tower roof material review — 19 November 2026

This five-preview audit selected one existing material mismatch in
`recycling-facility/conveyor-transfer-tower`. The broad tower and tail-house
roof sheets used the painted `structure` control even though the adjoining
profiled enclosure uses `cladding`. Both roof sheets now use `cladding`. Columns,
access steel and the roof vent cap stay on `structure`. Geometry, catalog
envelope, parameters, presets, triangle budget and asset identity are unchanged.

The [five-preview ledger](preview-review.md) records the silhouette, catalog
envelope and material roles for the tower, transfer chute, color-sorter camera,
inclined belt conveyor and magnetic drum separator. [Before](before/conveyor-transfer-tower.png)
and [after](after/conveyor-transfer-tower.png) renders show the two roof panels
matching the enclosure while the structure remains yellow.

## Baseline and overlap checks

- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) is merged with its
  reported CI checks successful and no submitted review.
- Active catalog PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was
  checked before sampling. It was open and blocked at the recorded head; its
  applicable checks were successful and no review had been submitted.
- All five selected assets were clear of exact open issue/PR path overlaps and
  the known fix branches #1298, #1305, #1307 and #1308. The saved check includes
  all open issue and pull-request results.
- All five public pages, source files and preview routes returned HTTP 200.
  Public source and preview hashes matched the local baseline and index rows.
  The current public tower page still serves the pre-change preview; this branch
  has not been deployed.

## Verification

- The regression failed against the original source on the roof material
  palette and passed after the correction. It checks both roof sheets, retained
  structural parts and exported GLB colors, along with the existing envelope,
  triangle count, controls and presets.
- ESLint passed for the complete recycling-facility kit and the new regression.
- The full catalog integration suite passed **160 files / 230 tests**, including
  the exhaustive source, export, and index freshness check.
- The recycling-facility quality scan passes **153/153 (100%)**. The global
  scan reports **2,398/2,402 (99.83%)**; its four unchanged below-gate assets
  are in `standard-components`.
- Regenerated the index from source. It remains at **2,402 assets / 50 kits**;
  only the `recycling-facility/conveyor-transfer-tower` row changed. The row's
  source SHA matches, and its preview path exists.
- The render command refreshed all 153 recycling-facility previews. Three
  post-refresh previews were opened and confirmed recognizable in color. The
  final target preview was rendered again after both roof assignments changed.
- Check output, generated-index evidence, and catalog freshness results are
  retained in [`verification/`](verification/).
- The full recycling-facility preview refresh was run; three post-refresh
  previews were opened and confirmed recognizable in color. The final target
  preview was rendered again after both roof assignments changed.
- The [15-second local MP4](review-demo.mp4) shows the five previews, before and
  after result, source material map and software regression. It does not show
  deployment, simulation, equipment performance, or hardware acceptance.

The public handoff describes generic kernelCAD asset behavior only. Dated
official product and technical references are recorded privately in
`kernelCAD-private/docs/competitors/2026-11-19-recycling-transfer-tower-roof-material-review.md`.
