# EV charging parking cable protection ramp material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/parking-cable-protection-ramp.png) → [after preview](after/parking-cable-protection-ramp.png)

This bundle records a five-preview semantic audit of existing EV charging site furniture assets. The audit found one material mismatch: `parking-cable-protection-ramp` drew a drive-over cable protector as a stainless steel slab with powder-coated metal blocks on top. A cable protection ramp is a moulded rubber or polyurethane body with polymer lids. The correction replaces both metal controls with `rampElastomer` ("Moulded rubber"), `coverPolymer` ("High-visibility polymer lid") and `anchorSteel` ("Galvanized anchor steel"). It also draws the body as a ramp with two sloped flanks and two sloped end caps, and moves the anchors out of the covers so that they show. It adds no asset ID or kit. The triangle count goes from 160 to 240 in a 2,400 budget. The bounds go from 1.33 m × 0.36 m × 0.15 m to 1.24 m × 0.50 m × 0.078 m.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the ev-charging-infrastructure quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 177 files / 247 tests with `--maxWorkers=2`.

The other four reviewed assets (`charging-island-plinth`, `ev-charger-protection-bollard`, `charging-station-direction-sign`, `wall-mounted-connector-holster`) have no corrected change. The ledger records their limits, which include a site island and curb labelled powder-coated metal, a bollard anchor plate that is round where the description says square, and a direction-sign top cap that floats 60 mm above the post.

## Evidence

- [Before source, preview and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and ramp-shape regression only. The branch is not deployed. This does not establish standards compliance, load rating, simulation results, or hardware acceptance.
