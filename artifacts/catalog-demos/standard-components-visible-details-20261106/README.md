# Standard-components visible-detail follow-up — 2026-11-06

**Demo:** [18-second source-to-preview workflow](standard-components-visible-details.mp4) · [poster](poster.png)

This follow-up reviewed the actual catalog-angle images after the kit passed the
formal material/preset gate. Three models still read as primitives: the pulley
had no teeth, the hinge leaves lay flat without alternating knuckles, and the
terminal block was a plain housing cube. The video compares those checked-in
previews with the revised local outputs, then shows source material controls,
named looks, size variants and the local verification summary.

## Changes

- Refined three existing assets; added no assets, IDs or kits.
- Added one material-named color control to each asset: pulley flange hardware,
  hinge fasteners, and terminal-block copper contacts. The existing `dark`,
  `brass` and `weathered` presets now set all three zones. No preset names were
  added; nine existing preset entries were extended.
- The pulley now has twenty radial teeth, paired retaining flanges with eight
  bolt heads, a keyed bore and aluminum / steel / hardware colors.
- The hinge now has upright perforated leaves, five alternating knuckles, a
  brass pivot pin and twelve fasteners.
- The terminal block now has paired slotted clamp screws, copper cages visible
  through windows on both sides, and a steel clip foot with an open underside.
- Mesh results remain under their measured budgets: pulley **1,236 / 1,380**,
  hinge **1,440 / 1,600**, terminal block **444 / 500** triangles.

The three previous sources and previews are retained in [`before/`](before/).
The final source is in `catalog/kits/standard-components/`; named size/preset
renders are in [`variants/`](variants/). Dated workflow comparisons were
recorded privately in the `kernelCAD-private` research workspace; public copy
describes native kernelCAD geometry and controls.

## Reproduce

From the repository root:

```sh
bash artifacts/catalog-demos/standard-components-visible-details-20261106/run_visible_details_checks.sh
python3 artifacts/catalog-demos/standard-components-visible-details-20261106/capture_visible_details_demo.py
python3 artifacts/catalog-demos/standard-components-visible-details-20261106/inspect_visible_details_video.py
```

The settings file records all 50 preview IDs, the exact preview invocation,
triangle budgets, variant renderer and local checks. The first command validates
the three sources, renders their default/size/preset variants, regenerates all
50 kit previews, rebuilds `catalog/index.json`, builds local catalog pages, and
runs the quality gate, ESLint and catalog integration tests.

## Verification and visual review

The generated [`verification.json`](verification.json), per-command outputs,
[`preview-index-check.json`](preview-index-check.json), and
[`local-page-check.json`](local-page-check.json) record source hashes, preview
paths, triangle counts, quality pass rates, lint, integration tests, and the
three generated local pages. Results: **50/50 kit assets (100%)** and
**2,390/2,390 catalog assets (100%)** pass the quality gate; all 50 kit preview
paths are present and their source hashes match; local page checks pass **19/19**;
ESLint is clean; catalog integration passes **4 files / 15 tests**. The
18-second H.264 MP4 was decoded and visually reviewed; notes and frame samples
are in [`video-review/`](video-review/).

The outputs are local source evaluation and software renders. This branch has
not been deployed; the models remain stylized generic scene assets, without
claims of vendor dimensions, manufacturing suitability or physical acceptance.
