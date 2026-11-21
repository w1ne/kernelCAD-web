# Wind energy tower section shell material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/tower-section.png) → [after preview](after/tower-section.png)

This bundle records a five-preview semantic audit of existing wind-energy tower and site hardware assets. The audit found one material mismatch: the `shaft`, `lower-collar` and `upper-band` of `tower-section` used a `stainlessSteel` control, and the shaft of the "Tapered tower section" was a straight cylinder. The correction gives the shell a `towerPaint` control, gives the flanges a `flangeSteel` control, removes the `stainlessSteel` control and tapers the shell from a 150 mm base radius to a 110 mm top radius. It adds no asset ID or kit; the asset goes from two colour controls to three.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the wind-energy quality gate passes 50/50 (100%). The full catalog integration suite passes 171 files / 241 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The other four reviewed assets (`wind-farm-meter-pedestal`, `aviation-light`, `turbine-door-frame`, `foundation-anchor-cage`) have no corrected change. The ledger records their limits, which include a status light that floats below the meter pedestal head and a stainless steel label on the anchor cage bolts.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and vertex-radius regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
