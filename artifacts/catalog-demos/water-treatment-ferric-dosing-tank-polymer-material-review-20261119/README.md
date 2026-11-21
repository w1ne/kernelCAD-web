# Water treatment ferric dosing tank polymer material review

**Demo:** [local MP4 review](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before preview](before/ferric-dosing-tank.png) → [after preview](after/ferric-dosing-tank.png)

This bundle records a five-preview semantic audit of existing water-treatment dosing, pipework and control assets. The audit found one material mismatch: `ferric-dosing-tank` drew the tank, lid, bund and level column in a `coatedSteel` control and the vent and outlet in a `stainlessSteel` control. Ferric chloride attacks both metals. The correction replaces the two steel controls with `tankPolymer`, `bundPolymer`, `pipePvc` and `sightTube`, seats the level sight tube on the tank shell (it stood 40 mm off it) and turns the dosing outlet into a horizontal stub that leaves the shell. It adds no asset ID or kit; the asset goes from two colour controls to four.

The focused exported-GLB regression failed on the baseline and passes after the correction (1/1). ESLint is clean; the water-treatment quality gate passes 50/50 (100%). The full catalog integration suite passes 172 files / 242 tests with `--maxWorkers=2`. The global structural scan reports 2,398/2,402 (99.83%); four unchanged one-color exceptions remain in `standard-components`.

The other four reviewed assets (`process-pipe-rack`, `pump-station-control-panel`, `sample-tap-station`, `fine-bubble-diffuser-grid`) have no corrected change. The ledger records their limits, which include upright "process lines" on the pipe rack and cabinet bodies that float above their plinths.

## Evidence

- [Before source and generated index row](before/)
- [After source, rendered preview and generated index row](after/)
- [Five-preview contact sheet](preview-review-five-assets.png) · [reviewed previews and source snapshots](samples/)
- [Preview audit ledger](preview-review.md)
- [Focused GLB regression, lint, quality, catalog integration and index checks](verification/)
- [Demo generation source](make_demo.py) · [settings](demo-settings.json) · [video inspection](video-review/inspection.md)

The clip shows local source editing, a software-rendered preview and an exported-GLB colour and part-placement regression only. The branch is not deployed. This does not establish standards compliance, chemical compatibility, simulation results, or hardware acceptance.
