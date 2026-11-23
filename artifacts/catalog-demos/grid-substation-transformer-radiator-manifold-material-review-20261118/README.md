# Grid-substation radiator-bank material review — 18 November 2026

The five-preview audit is recorded in [`preview-review.md`](preview-review.md). The source selected for correction was `grid-substation/substation-transformer-radiator-bank`: its two oil-side steel manifolds were assigned the copper color, so they read as electrical conductors. Both now use the existing stainless-steel control, and the unused copper control and preset values were removed. Geometry, scale, triangle budget, and the `weathered` and `maintenance` preset names are unchanged.

## Before and after

- [Before preview, source, and index row](before/)
- [After preview, source, and generated index row](after/)
- [All five reviewed previews and source snapshots](samples/)
- [Open issue/PR overlap check](verification/open-target-check.json)
- [Generated index diff and source/preview check](verification/index-diff.txt), [check result](verification/index-row-check.json)

The local preview shows the two manifolds in the same steel gray as the fin bank; the painted header rails remain green. The asset is 200 triangles under its 1,800-triangle budget. The generated index diff changes only this asset row, and its `sourceSha256` matches the source. Its preview reference is present and the checked-in preview exists.

## Verification

- The new exported-GLB regression failed on the original source at `inlet-manifold` and passes after the correction: [before](verification/test-before.txt), [after](verification/test-focused-after.txt).
- Full catalog integration passed: 154 files and 224 tests, including the all-asset export and index freshness check: [`catalog-integration.txt`](verification/catalog-integration.txt).
- ESLint passed for the full grid-substation kit and the new test. The grid-substation material/preset quality gate passes 80/80 (100.00%): [quality result](verification/quality-kit.txt).
- The five target slugs were checked against all six open PRs, eight open issues, and tracked fixes #1298/#1305/#1307/#1308; no overlap was found.
- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged with every reported check successful and no submitted review. Before this follow-up, open PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) had all non-skipped checks successful and no submitted review; evidence is in `verification/`.

The hosted evaluator built both the original and edited source but returned `ok: false` for the same two existing overlaps (`radiator-fin-1`/`inlet-manifold` and `radiator-fin-6`/`outlet-manifold`). These diagnostics predate this appearance-only edit. The local software renderer and exported-GLB regression verify the color correction; the hosted interference check remains a model limitation. Details are in [`hosted-evaluation.md`](verification/hosted-evaluation.md).

The live catalog page and its preview returned HTTP 200 before the edit; the live image matched the saved baseline byte-for-byte. This branch is not deployed, so no post-change public-page verification is claimed.

## Demo

[Watch the 15-second review demo](review-demo.mp4). Recreate it with [`make_demo.py`](make_demo.py); source samples, invocation, settings, video metadata, and inspected frames are retained in this bundle. The video shows local software-rendered catalog previews and an exported-GLB regression only; it is not a simulation, deployment, or hardware acceptance.

This is a generic native kernelCAD catalog asset, not a manufacturer-specific model. The dated official product-reference comparison is kept privately in [kernelCAD-private](../../../../kernelCAD-private/catalog-industrial-plant-20261102/grid-substation-radiator-manifold-material-comparison-2026-11-18.md).
