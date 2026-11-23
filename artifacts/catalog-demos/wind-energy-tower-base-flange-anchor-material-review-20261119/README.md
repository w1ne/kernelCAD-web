# Wind energy tower base flange anchor material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/tower-base-flange.png) → [after preview](after/tower-base-flange.png)

This bundle records a five-preview semantic audit of existing wind-energy tower flange, blade-root and site assets. The audit found one material mismatch: `tower-base-flange` drew its eight anchor parts with a `stainlessSteel` control. Wind tower anchor bolts are galvanized or coated high-strength carbon steel. The anchors were also hidden inside the flange, so the control had no visible effect. The correction replaces the control with `anchorSteel` ("Galvanized anchor steel"), draws each anchor as a stud with a nut on the flange top, and widens the shell stub from 240 mm to 380 mm. It adds no asset ID or kit.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the wind-energy quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 175 files / 245 tests with `--maxWorkers=2`.

The other four reviewed assets (`turbine-blade-root-sleeve`, `blade-root-protector`, `tower-transport-saddle`, `turbine-number-placard`) have no corrected change. The ledger records their limits, which include securing tabs hidden inside the protector ring, flat saddle supports with upright "ties", and a number placard with no number.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
