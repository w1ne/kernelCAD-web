# Construction equipment silhouette refinement — 2026-11-06

**Demo:** [21-second source-to-preview workflow](construction-equipment-silhouette-refinement.mp4) · [poster](poster.png) · [video contact sheet](video-review/contact-sheet.png)

The current quality gate already passed the whole 60-asset construction-equipment kit. This visual follow-up reviewed its rendered defaults and refined three existing models whose previews still read as a small set of large blocks. It adds no kit or asset IDs and does not count these edits as promotions from thin assets.

## Results

- **Towable light tower:** added a wheeled generator trailer, service enclosure, two-section mast, visible lamp lenses and four stabilizer jacks. Mast extension choices are 1200/1800/2400 mm; the head count is 2/4/6. Default render: **1,328 / 2,200** triangles.
- **Ride-on power trowel:** replaced the solid rotor discs with hollow guard rings and separate radial blade shoes; narrowed the chassis bridge and separated its engine, bucket seat and paired steering controls. Rotor diameter choices are compact/standard/wide; each rotor has 4 or 6 blade shoes. Default render: **1,112 / 2,200** triangles.
- **Concrete batch plant:** added tapered aggregate hoppers, individual metering outlets, a shared feed belt, a visible central mixer, a steel support frame, silo ladder and control cabin. Bin count is 2/3/4 and silo-body height is 1200/1500/1900 mm. Default render: **1,500 / 2,200** triangles.
- Each source now has four material-named color controls. The existing weathered and highVisibility presets were extended to cover the new material zones. This adds **6 material color controls** across the three assets and extends **6 preset variant blocks**; it adds **0 new preset names**.
- The kit's **60/60** preview PNGs were regenerated and the catalog index was rebuilt. All 60 source hashes and preview paths match. Three local static pages and their copied previews were also checked.
- The quality gate remains **2,390/2,390 assets passing (100.00%; 0 thin assets)** across 49 kits; construction-equipment remains **60/60 passing (100%)**. ESLint and the requested catalog integration suite passed. See [verification.json](verification.json), [preview-index-check.json](preview-index-check.json), and [local-page-check.json](local-page-check.json).

The source-driven palette and shape variants are in [variants/](variants/), while [before/](before/) retains the original source and preview bytes. [demo-settings.json](demo-settings.json) records the preview IDs, material controls, choice values, preset names, triangle budgets and workflow commands. [variant-renders.json](variant-renders.json) records each rendered value and the final source hashes.

The deterministic kernelCAD render-inspect attempt attached to the existing Chrome CDP endpoint on port 9223, completed the websocket handshake, then timed out after 30 seconds. The command required the existing attachment and did not launch another browser. The browser remained running with the same four tabs. The [attachment result](inspection/render-inspect-cdp-failure.md) and full command output are retained; the software-rendered catalog previews and source-driven variants were opened and reviewed instead.

## Reproduce

From the repository root:

    bash artifacts/catalog-demos/construction-equipment-silhouette-20261106/run_construction_equipment_checks.sh
    python3 artifacts/catalog-demos/construction-equipment-silhouette-20261106/capture_construction_equipment_demo.py
    python3 artifacts/catalog-demos/construction-equipment-silhouette-20261106/inspect_construction_equipment_video.py

The checks script rebuilds all 60 kit previews and the catalog index, evaluates the three edited sources and variants, builds local static catalog pages, and records source-hash, preview-path, quality, lint and integration evidence. The generated page directory is recorded in local-pages-output-dir.txt.

Dated comparable workflow and product-form research is retained privately in kernelCAD-private. Public source and demo copy describe only these native kernelCAD assets, parameters, presets and renders.

The branch is not deployed. The pages checked here are local generated output. These are stylized scene props; no product dimensions, operating simulation, equipment performance, safety, manufacturing suitability, deployed behavior or physical acceptance is established.
