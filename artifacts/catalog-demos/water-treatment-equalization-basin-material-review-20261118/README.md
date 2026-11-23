# Equalization basin material review — 18 November 2026

This round reviewed five rendered water-treatment previews and corrected one
material-role mismatch in `water-treatment/equalization-basin`. The source had
assigned the stainless-steel finish to the floor slab and the concrete finish
to the mixer assembly. The floor and four perimeter walls now use `concrete`;
the mixer pedestal, arm and hub use `stainlessSteel`.

No assets, parameters, or presets were added. The existing concrete and
stainless-steel controls remain editable, along with the `weathered` and
`highVisibility` presets. The preview has 224 triangles against a 2,200
triangle budget.

## Review and result

- [Five-preview audit ledger](preview-review.md)
- [Five-preview contact sheet](preview-review-five-assets.png)
- [Before preview](previews/before/equalization-basin.png) and [after preview](previews/after/equalization-basin.png)
- Before and after source snapshots are in `sources/before/` and `sources/after/`; the five reviewed sources are in `sources/reviewed/`.
- [Regression test source](tests-equalizationBasinFloorMaterial.test.ts)
- [MP4 review bundle](water-treatment-equalization-basin-material-review.mp4)
- [MP4 generation settings](demo-settings.json) and [invocation](make_demo.sh)
- [Video frame inspection](video-review/inspection.md)

The GLB regression checks the floor and all four walls against the concrete
finish, then checks the three named mixer parts against stainless steel. The
regression failed on the baseline source and passed after the correction.
ESLint is clean, the generated index row matches the current source SHA and
preview path, and the full catalog integration suite passed **147/147 files
and 217/217 tests**. Command output and index evidence are retained in
`verification/`.

The water-treatment quality gate passes **50/50 assets (100%)**. The global
gate reports **2,398/2,402 assets (99.83%)**; its four thin assets are in
`standard-components` (`beam-coupling`, `din-rail`, `hose-barb-adapter`, and
`retaining-ring`) and are outside this change.

## Scope

All images are local software renders from the checked-in kernelCAD source.
The MP4 records the preview and exported-GLB regression only. This change has
not been deployed and makes no claim about treatment performance, process
simulation or hardware acceptance.
