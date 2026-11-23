# Data-center emergency power-off station actuator material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/emergency-power-off-station.png) → [after preview](after/emergency-power-off-station.png)

This bundle records a five-preview semantic audit of existing emergency-stop station and instrument post assets. The selected correction makes the actuator of `emergency-power-off-station` a red mushroom head that faces the operator on a yellow collar. Before, it was a yellow cap on an upright red steel cup. The correction adds one colour control (`actuatorPolymer`). It adds no asset ID or kit.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the data-center-infrastructure quality gate passes 50/50 (100%). The full catalog integration suite passes 167 files / 237 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

Two of the other four reviewed assets (`ev-emergency-stop-station`, `sorter-emergency-stop-pedestal`) show the same upright, amber actuator. This round does not correct them; the ledger has the details and the geometry limits.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and bounds regression only. The branch is not deployed. This does not establish a safety function, standards compliance, simulation results, or hardware acceptance.
