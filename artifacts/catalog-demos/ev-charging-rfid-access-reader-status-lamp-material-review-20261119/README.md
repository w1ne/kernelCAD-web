# EV charging RFID access reader status lamp material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/rfid-access-reader-pedestal.png) → [after preview](after/rfid-access-reader-pedestal.png)

This bundle records a five-preview semantic audit of existing EV charging site furniture assets. The audit found one material mismatch: the `status-lamp` of `rfid-access-reader-pedestal` used the housing `powderCoat` control, stood upright and floated 34 mm in front of the post. The correction gives the lamp an `indicatorPolymer` control (green by default) and seats it on the post face below the reader. It adds no asset ID or kit; it adds one colour control.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the ev-charging-infrastructure quality gate passes 50/50 (100%). The full catalog integration suite passes 169 files / 239 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The other four reviewed assets (`parking-wheel-stop`, `charging-payment-terminal`, `charger-cable-holster-bollard`, `ev-parking-bay-sign`) read as their objects. The ledger records their limits; this round does not change them.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and bounds regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
