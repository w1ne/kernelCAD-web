# Wind energy site bollard reflector band material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/wind-site-bollard.png) → [after preview](after/wind-site-bollard.png)

This bundle records a five-preview semantic audit of existing wind-energy site and foundation assets. The audit found one material mismatch: `wind-site-bollard` drew its two reflector bands with a `stainlessSteel` control, so the preview showed two grey steel collars and no reflector. The correction replaces the control with `reflectiveBand` ("Reflective sheeting", default red) and draws each band as an 80 mm wrap that stands 3 mm proud of the post. It adds no asset ID or kit. The triangle count (188) and the bounds are unchanged.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the wind-energy quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 176 files / 246 tests with `--maxWorkers=2`.

The other four reviewed assets (`crane-outrigger-pad`, `cable-trench-cover`, `foundation-inspection-hatch`, `turbine-junction-box`) have no corrected change. The ledger records their limits, which include a steel top plate hidden inside the outrigger pad, trench-cover "slots" drawn as painted patches, hatch bolts hidden inside the lid, and a junction-box lid drawn as a mid-body band.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and band-size regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
