# Shipyard panel line strongback longitudinal-rail material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/panel-line-strongback.png) → [after preview](after/panel-line-strongback.png)

This bundle records a five-preview semantic audit of existing shipyard fixture and support assets. The selected correction gives both longitudinal rails of `panel-line-strongback` the yard finish. It adds no asset ID or kit and makes no geometry change.

The focused exported-GLB regression failed on the baseline at `longitudinal-rail-1` and passes after the correction (1/1). ESLint is clean; the shipyard quality gate passes 70/70 (100%). The full catalog integration suite passes 165 files / 235 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The audit also recorded description and geometry limits that this round does not correct: three descriptions name parts that the models do not contain, the plate stack renders as one block, and the skid lifting eyes are solid posts. The ledger has the details.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB color regression only. The branch is not deployed. This does not establish load capacity, compliance, simulation results, or hardware acceptance.
