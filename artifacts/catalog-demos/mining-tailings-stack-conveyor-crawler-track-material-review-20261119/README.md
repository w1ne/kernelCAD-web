# Tailings stack conveyor crawler material review

This bundle records a five-preview mining equipment audit and the material
assignment correction for `mining/tailings-stack-conveyor`.

## Review

- [Five-preview ledger](preview-review.md)
- Before/after preview: [before](before/tailings-stack-conveyor.png) · [after](after/tailings-stack-conveyor.png)
- Before/after source and generated index row: [`sources/`](sources/) · [`before/`](before/) · [`after/`](after/)
- Focused exported-GLB regression: [`tests/integration/catalog/miningTailingsCrawlerTrackMaterial.test.ts`](../../../tests/integration/catalog/miningTailingsCrawlerTrackMaterial.test.ts)
- Five selected preview images and source snapshots: [`samples/`](samples/) · [`sources/reviewed/`](sources/reviewed/)
- Current public baseline pages, sources, previews, hashes and exact open-target scan: [`live-baseline/`](live-baseline/) · [`verification/open-target-check.json`](verification/open-target-check.json)
- Dated official product/material comparison: private `kernelCAD-private` repository

## Demo

- [Inspected 15-second MP4](review-demo.mp4)
- [Demo generation source](make_demo.py), [settings](demo-settings.json), and [video inspection](video-review/inspection.md)

The demo records a local software-rendered preview and exported-GLB regression.
It is not an equipment simulation, deployment check, or hardware acceptance.

## Verification

Commands and captured results are retained in [`verification/`](verification/).
The source correction moves twenty crawler track parts from `beltRubber` to the
existing `crawlerSteel` control. Geometry, envelope, triangle budget, parameter
set, presets and asset identity are unchanged. The catalog index was regenerated
with the source edit; the live site was checked only against the pre-change
baseline and has not been deployed from this branch.
