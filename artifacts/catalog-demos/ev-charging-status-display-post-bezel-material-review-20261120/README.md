# EV charging status display post bezel material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/charger-status-display-post.png) → [after preview](after/charger-status-display-post.png)

This bundle records a five-preview semantic audit of existing EV charging plugs and posts. The audit found one material mismatch: `charger-status-display-post` drew its `display-bezel` with the `displayGlass` control ("Display glass"), the same control as the screen glass. A bezel is the opaque frame around the glass. The screen was also on the lower cabinet door at 354 mm, although the description calls the asset a wayfinding-height display post. The correction adds a `bezelPolymer` control ("Screen bezel (black polymer)") for a frame 20 mm wider than the glass on each side, and moves the bezel and glass to a new powder-coated `display-housing` on the column head, with the glass bottom edge at 1.45 m. It adds no asset ID or kit. The triangle count goes from 252 to 264 in a 2,400 budget. The bounds go from 0.5022 m × 0.32 m × 1.785 m to 0.5022 m × 0.321 m × 1.785 m (width × depth × height).

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the ev-charging-infrastructure quality gate passes 50/50 (100%). The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`. The full catalog integration suite passes 180 files / 250 tests with `--maxWorkers=2`.

The other four reviewed assets (`ccs-combo-1-connector`, `chademo-connector`, `j1772-ac-connector`, `overhead-cable-balance-arm`) have no corrected change. The three plugs have no material mismatch. The ledger records the limits of the balance arm: a stainless floor mast and two cable drops that end in mid-air with no connector.

## Evidence

- [Before source, preview and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, accessibility of the screen height, simulation results, or hardware acceptance.
