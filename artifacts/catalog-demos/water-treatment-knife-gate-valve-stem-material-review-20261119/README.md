# Water treatment knife gate valve stem material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/knife-gate-valve-assembly.png) → [after preview](after/knife-gate-valve-assembly.png)

This bundle records a five-preview semantic audit of existing water-treatment valve and mix-tank assets. The audit found one material mismatch: `knife-gate-valve-assembly` drew its rising `stem` in the painted `coatedSteel` control. A rising stem slides through the packing gland, so it is bare stainless steel. The correction moves the stem to the existing `stainlessSteel` control, lays the two pipe stubs on the pipe run axis (they stood upright beside the body) and stands the body on its mount foot (it floated 20 mm above it). It adds no asset ID, kit or colour control.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the water-treatment quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 173 files / 243 tests with `--maxWorkers=2`.

The other four reviewed assets (`check-valve-assembly`, `lime-slurry-tank`, `coagulant-mixing-tank`, `flocculation-tank`) have no corrected change. The ledger records their limits, which include "open" tanks with solid tops, paddles that hang above the tanks and a check-valve cover on the pipe flange face.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, simulation results, or hardware acceptance.
