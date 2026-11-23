# Water treatment pressure reducing valve stem material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/pressure-reducing-valve-assembly.png) → [after preview](after/pressure-reducing-valve-assembly.png)

This bundle records a five-preview semantic audit of existing water-treatment valve, spool and gate-hoist assets. The audit found one material mismatch: `pressure-reducing-valve-assembly` drew its adjusting `stem` in the painted `coatedSteel` control. The stem turns through the actuator cover, so it is bare stainless steel. The correction moves the stem to the existing `stainlessSteel` control and lays the body and its two flanges on the pipe run axis (the body stood upright on one flange, with the bonnet on the face of the other). It adds no asset ID, kit or colour control.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the water-treatment quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 174 files / 244 tests with `--maxWorkers=2`.

The other four reviewed assets (`air-release-valve-assembly`, `static-mixer-spool`, `flow-meter-spool`, `intake-gate-hoist`) have no corrected change. The ledger records their limits, which include a flow-meter sensor and transmitter hidden inside the spool, an upright "side" vent stub and a hoist drum with a vertical axis.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
