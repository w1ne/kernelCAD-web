# EV charging mobile fast-charge cart tyre material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/mobile-fast-charge-cart.png) → [after preview](after/mobile-fast-charge-cart.png)

This bundle records a five-preview semantic audit of existing EV charging site equipment assets. The audit found one material mismatch: `mobile-fast-charge-cart` drew its two wheels with the `powderCoat` control ("Powder-coated metal"), the same control as the enclosure. A cart wheel has a rubber tyre on a metal hub. The wheels were also upright drums in front of the door, and the enclosure stood on the ground, so the cart could not roll. The correction adds a `tyreRubber` control ("Wheel tyre rubber") for four tyres on horizontal axles beside the chassis, each with a painted hub. It lowers the chassis, stands the enclosure on it, carries the push handle on two brackets, seats the cable reel on the rear wall and seats the status button on the door. It adds no asset ID or kit. The triangle count goes from 384 to 672 in a 2,400 budget. The bounds go from 0.82 m × 1.178 m × 1.182 m to 0.956 m × 1.05 m × 1.182 m (width × depth × height).

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the ev-charging-infrastructure quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 179 files / 249 tests with `--maxWorkers=2`.

The other four reviewed assets (`coiled-charging-cable-reel`, `charger-cable-retractor`, `ev-metering-pedestal`, `home-ac-wallbox`) have no corrected change. The ledger records their limits, which include a cable reel with no cable on its drum, a floor mast under an asset that the description calls overhead, a meter dial that lies flat, and a wallbox cable hook that floats beside the enclosure.

## Evidence

- [Before source, preview and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, load rating, simulation results, or hardware acceptance.
