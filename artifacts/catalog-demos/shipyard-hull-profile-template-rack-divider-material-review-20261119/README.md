# Shipyard hull-profile template rack divider material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/hull-profile-template-rack.png) → [after preview](after/hull-profile-template-rack.png)

This bundle records a five-preview semantic audit of existing shipyard rack, jig and frame assets. The selected correction gives all five identical bay dividers of `hull-profile-template-rack` the structural steel finish. It adds no asset ID or kit and makes no geometry change.

The focused exported-GLB regression failed on the baseline at `divider-0` and passes after the correction (1/1). ESLint is clean; the shipyard quality gate passes 70/70 (100%). The full catalog integration suite passes 163 files / 233 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The audit found the same defect class (the first of several identical members uses `yardPaint`) in the other four reviewed assets. Those are recorded in the ledger and are not corrected here.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB color regression only. The branch is not deployed. This does not establish load capacity, compliance, simulation results, or hardware acceptance.
