# Industrial plant machine refinement — 2026-11-09

**Demo:** [industrial-plant-machine-refinement.mp4](industrial-plant-machine-refinement.mp4) ·
[poster](poster.png) · [video inspection](video-review/contact-sheet.png)

This round refines three existing assets after their previews still read as
grey/orange blocks. The diesel generator now has a louvered radiator, isolated
mounts, service door and control panel; the conveyor separates its rubber belt,
rollers, guarded frame and drive motor, with supports that reach the deck; and
the transformer separates its tank, radiator fins, ribbed porcelain bushings
and copper terminals. Louver count, conveyor support-station count, and
transformer fin count change the generated geometry. No asset IDs or kits were
added.

## Result and review

- The three edited assets now each expose four material-named color controls,
  three named presets, an overall scale control, and a geometry choice. This
  adds six material controls and three presets across the existing assets.
- Default exports are 564 triangles for the generator under its 1,800 budget,
  992 for the conveyor under 2,600, and 2,528 for the transformer under 3,200.
  The tested geometry variants export at 588, 1,052 and 2,576 triangles.
- All **60 industrial-plant previews** were re-rendered before regenerating
  `catalog/index.json`. The three edited source hashes match their index rows;
  every kit asset has an indexed preview URL and a present preview PNG.
- The kit gate is **60/60 passing**. The catalog remains **2,402/2,402 passing
  (100.00%; 50 rich kits, 0 thin kits)**. This is quality improvement at the
  existing catalog count.
- Preview review: the generator now reads as a packaged set with radiator and
  controls; the conveyor has a continuous belt, visible rollers, connected
  supports and a drive; the transformer has two cooling banks and distinct
  primary/secondary insulators. The high-visibility and utility-green variants
  recolor the assigned parts. The 6-point MP4 contact sheet was decoded and
  visually inspected.
- Kit ESLint passed. Catalog integration tests passed: **4 files, 15 tests**,
  including the full source/index freshness and triangle-budget rebuild
  (`catalog-test-output-final.txt`; final-tree run status is recorded in
  `catalog-test-process-final.json`).
- Locally generated detail pages for all three edited assets show their current
  controls, presets, geometry choices, Studio links, and copied current
  previews. `catalog-pages-check-final.json` records matching source and
  preview hashes.

## Evidence bundle

- `before/` and `before-source/` preserve the indexed previews and source files
  from the starting commit; `variants/` contains default, preset and geometry
  renders with hashes. `variant-manifest.json` records source hashes,
  triangle counts and checks that options change geometry and appearance.
- `render_variants.ts`, `capture_demo.py`, `inspect_video.py`,
  `verify_catalog_index.py`, and `verify_local_pages.py` are the reproducible
  source and verification helpers. `demo-settings.json` and `invocations.txt`
  preserve their settings and commands.
- `catalog-index-output-final.txt`,
  `catalog-index-output-final-verified.txt`,
  `catalog-test-output-final.txt`, `catalog-pages-output-final.txt`,
  `catalog-pages-check-final.json`, and the final quality and lint output files
  retain command evidence. `video-review/` contains decoded MP4 samples and the
  inspected contact sheet.
- The dated comparison is stored privately at
  `/home/andrii/worktrees/kernelCAD-private/catalog-industrial-plant-machine-visual-quality-20261109/COMPARISON.md`.

## Claim boundary

The branch is not deployed. These checks establish authored source, generated
catalog data, local static pages, and software-rendered previews only. The
assets do not specify vendor equipment, electrical ratings, process behavior,
operator safety or manufacturing suitability, and no physical acceptance is
claimed.
