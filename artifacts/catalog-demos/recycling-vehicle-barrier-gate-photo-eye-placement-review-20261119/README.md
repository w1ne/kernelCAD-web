# Recycling-facility vehicle barrier gate photo-eye placement review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/vehicle-barrier-gate.png) → [after preview](after/vehicle-barrier-gate.png)

This bundle records a five-preview semantic audit of existing recycling-facility site equipment assets. The audit found no material mismatch in the five assets. It found one physical-feature defect: both photo-eye posts of `vehicle-barrier-gate` stood inside the drive lane, with the beam along the direction of travel. The correction moves the pair to the lane edges (cabinet plinth and rest post) and turns the lenses to face each other across the lane. It adds no asset ID, kit or control.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the recycling-facility quality gate passes 153/153 (100%). The full catalog integration suite passes 168 files / 238 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The other four reviewed assets (`tyre-dropoff-rack`, `truck-wheel-wash`, `roller-conveyor-section`, `walking-floor-trailer`) read as their objects. The ledger records minor limits; this round does not change them.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB bounds regression only. The branch is not deployed. This does not establish a safety function, standards compliance, simulation results, or hardware acceptance.
