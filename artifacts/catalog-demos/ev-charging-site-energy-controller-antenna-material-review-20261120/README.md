# EV charging site energy controller antenna material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/site-energy-management-controller.png) → [after preview](after/site-energy-management-controller.png)

This bundle records a five-preview semantic audit of existing EV charging site equipment assets. The audit found one material mismatch: `site-energy-management-controller` drew its two antennas with the `powderCoat` control ("Powder-coated metal"), the same control as the enclosure. A site controller antenna is a whip in a polymer radome on a metal connector. The correction adds an `antennaPolymer` control ("Antenna radome polymer") for the two whips and adds two stainless steel connectors that stand on the top cap. It also moves the mounting plate from the middle of the enclosure to the rear wall and seats the status button on the door. It adds no asset ID or kit. The triangle count goes from 240 to 328 in a 2,400 budget. The bounds go from 0.56 m × 0.352 m × 1.10 m to 0.56 m × 0.3585 m × 1.082 m (width × depth × height).

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the ev-charging-infrastructure quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 178 files / 248 tests with `--maxWorkers=2`.

The other four reviewed assets (`charger-canopy-column-base`, `curbside-lamp-charger`, `streetlight-charger-arm`, `fleet-charging-canopy`) have no corrected change. The ledger records their limits, which include teal powder-coated gussets on a stainless structural column, two lamp chargers that differ only in mast height, and canopy cable drops that are horizontal rods.

## Evidence

- [Before source, preview and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, radio performance, simulation results, or hardware acceptance.
