# Space exploration material refinement — 2026-11-09

This round refined **36 existing assets** in the 52-asset space-exploration kit.
Each refined asset gained one material-named control assigned to an actual part;
every asset retains named material presets. The instrument arm now has a supported,
connected silhouette and the oxygen rack has visible valve fittings. No catalog IDs
or kits were added.

## Review and evidence

- [MP4 workflow and result](space-exploration-materials-refinement.mp4) — 21 seconds,
  1280×720. The demo shows before/after renders, source assignments, the kit gallery,
  and local verification results.
- [Preview review](preview-review.md) — visual inspection of the arm, tool chest, and
  oxygen-cylinder rack.
- [Verification results](verification.json) — generated index source hashes,
  preview coverage, triangle budgets, quality gate, lint, integration, and local-page
  checks, with deployment and hardware acceptance explicitly false.
- [Video inspection](video-review.md) and [inspection metadata](video-inspection.json)
  — frame decoding and visual inspection notes.
- [Promotion plan](PROMOTION_PLAN.md), [deterministic source transformation](promote_space_materials.py),
  [36-source replay check](source-transform-verification.json),
  [capture script](capture_space_materials_demo.py), [inspection script](inspect_space_materials_video.py),
  and [invocations](invocations.txt) preserve the source, settings, and replay steps.
- `catalog-render-output.txt`, `catalog-index-output.txt`, `catalog-test-output.txt`,
  and the `catalog-*-status.json` files retain command output and check summaries.
- `before/` contains the previously indexed previews used for comparison; `frames/`
  contains the seven source frames used to produce the video.

The material-control distribution in this kit is one two-color asset (the
rover-wheel assembly keeps its real aluminum/rubber pair), 49 three-color assets,
and two four-color assets. The catalog quality gate for this checkout is
**2,402/2,402 passing (100%, 50 rich kits, 0 thin kits)**. These are local source,
render, index, and page checks. The changes have not been deployed and make no
mission simulation, hardware, or flight-acceptance claim.

## Reproduction

Run the commands in [invocations.txt](invocations.txt) from the repository root.
The promotion script is deterministic against the source at the start of this
round; the invocation notes explain how to restore that starting point for replay.
Preview rendering precedes index generation so all 52 index rows carry current
preview paths and source hashes.

The dated product comparison used during design is retained privately in
`kernelCAD-private/catalog-space-exploration-materials-20261109/COMPARISON.md`.
The public artifact describes native kernelCAD source and rendering behavior.
