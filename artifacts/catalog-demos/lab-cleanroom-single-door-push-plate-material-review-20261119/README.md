# Lab cleanroom single-door push plate material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/cleanroom-single-door-module.png) → [after preview](after/cleanroom-single-door-module.png)

This bundle records a five-preview semantic audit of existing laboratory infrastructure door and wall-service assets. The audit found one material mismatch: the `door-push-plate` of `cleanroom-single-door-module` used the leaf `enamel` control, was a 40 mm bar and floated 3 mm off the leaf. The correction gives the plate a `stainless` control and makes it a 100 mm × 300 mm sheet that lies on the leaf face. It adds no asset ID or kit; it adds one colour control.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the lab-infrastructure quality gate passes 60/60 (100%). The full catalog integration suite passes 170 files / 240 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The other four reviewed assets (`cold-room-door-module`, `laboratory-wall-eyewash-station`, `laboratory-water-service-console`, `cleanroom-pass-through-chamber`) have no corrected change. The ledger records their limits, which include the same push-plate defect on the cold-room door and a door placement defect on the pass-through chamber.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and bounds regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
