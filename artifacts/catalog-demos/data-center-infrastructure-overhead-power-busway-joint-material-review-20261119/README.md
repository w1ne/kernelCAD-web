# Data-center busway joint-cover material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/overhead-power-busway.png) → [after preview](after/overhead-power-busway.png)

This bundle records a five-preview semantic audit of existing data-center infrastructure catalog assets. The selected correction gives all four repeated overhead busway joint covers a shared steel finish. It adds no asset ID or kit and makes no geometry change.

The focused exported-GLB regression failed on the baseline at `cover-joint-0` and passes after the correction (1/1). ESLint is clean; the data-center quality gate passes 50/50 (100%). The full catalog integration suite passes 162 files / 232 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/) · [hosted kernelCAD evaluation and baseline comparison](verification/hosted-kernelcad-build.md)
- [Demo generation source and settings](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB color regression only. The branch is not deployed. This does not establish electrical performance, installation suitability, code compliance, simulation results, or hardware acceptance.
