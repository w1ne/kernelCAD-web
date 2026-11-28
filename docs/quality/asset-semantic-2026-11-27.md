# Asset semantic review — 2026-11-27

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was checked first;
it is merged with all 17 reported CI checks successful. The five selected
assets were checked against open issue/PR targets and known fixes #1298,
#1305, #1307 and #1308; no selected path or ID overlapped. The captured
pre-edit live detail/source/preview routes for all five samples returned HTTP
200 and matched their local baseline hashes.

Reviewed rendered assets: `recycling-facility/eddy-current-separator`,
`grid-substation/substation-main-power-transformer`,
`water-treatment/vertical-turbine-pump`, `wind-energy/offshore-wind-turbine`,
and `industrial-plant/centrifugal-pump`. Their visible geometry, dimensions,
material roles, and labels are recorded in the [five-preview ledger](../../artifacts/catalog-demos/water-treatment-vertical-turbine-pump-motor-finish-review-20261127/preview-review.md).
Four had no selected mismatch. The vertical turbine pump head's six motor
cooling ribs used `structuralSteel` while its motor housing, fan cowl, and
terminal box used `motorFinish`. The ribs now use `motorFinish`. Geometry,
dimensions, controls, presets, budget and asset identity remain unchanged at
2,276 triangles. The generated envelope is not a vendor-verified dimension.

The exported-GLB regression failed against the original assignment and passes
after the correction (1/1). Water-treatment ESLint is clean. The full catalog
integration suite passed **229/229 files and 384/384 tests**, including the
catalog-wide source/export/index-freshness check. The target preview was
rendered and opened after the change; the eddy-current separator and power
transformer previews were also reopened. The regenerated index still has
2,402 assets / 50 kits; only the pump row's palette and source SHA changed.
The target hash matches disk and its preview path exists.

The material/preset quality gate reports water-treatment at **50/50 (100%)**.
The global gate reports **2,396/2,402 (99.75%)**; the six unchanged outliers
are recorded in the [handoff bundle](../../artifacts/catalog-demos/water-treatment-vertical-turbine-pump-motor-finish-review-20261127/README.md).
The [15-second MP4](../../artifacts/catalog-demos/water-treatment-vertical-turbine-pump-motor-finish-review-20261127/review-demo.mp4)
shows the five-sample audit, before/after render, material mapping and local
verification. Commands, settings, snapshots, hashes, test output and video
inspection notes are retained in that bundle. The dated official product
comparison is retained privately in `kernelCAD-private`.

The public page, source and preview were verified as a pre-edit baseline. This
branch is not deployed; the reported checks cover local software renders and
exported-GLB material assignment only, not equipment performance, process
simulation or hardware acceptance.
