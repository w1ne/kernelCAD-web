# Shipyard catalog quality promotion — 2026-11-04

This round promotes the 70 existing shipyard assets in place. It adds no kit IDs
or asset IDs. Sources now use 178 material-specific color controls across the
kit: 108 more than the previous one-color-per-asset sources. Each asset has two
named finish presets, `fresh-coat` and `weathered-yard` (140 preset entries
total), and uses profiled low-poly geometry while remaining below its
1,800-triangle ceiling.

## Visual review

All 70 catalog previews were rendered from the updated sources. I opened three
final previews at original resolution and confirmed they read as their named
objects in color:

- `dock-gate-caisson.png`: six raised steel stiffeners on a gray-green caisson,
  teal flotation cells, and visible deck cleats.
- `welding-gas-cylinder-trolley.png`: two cylinders seated on the cart plate,
  yellow retaining bands, dark wheels, a steel handle, and valve details.
- `grit-recovery-hopper.png`: tapered brown collection bin, pale screen slats,
  and gray fork supports.

Hashes and review notes are in [`visual-review.json`](visual-review.json). A
local scale-and-color variant is in [`quality-variant.png`](quality-variant.png).

## Demo

[`shipyard-quality.mp4`](shipyard-quality.mp4) is a 36-second H.264 walkthrough
at 1280×720 and 24 fps. It shows the six kit zones, a native asset source and
its material controls, a local color/scale variant, all 70 rendered previews,
and local validation results. The extracted-frame contact sheet is
[`video-contact-sheet.png`](video-contact-sheet.png); MP4 metadata and
inspection details are in [`video-inspection.json`](video-inspection.json).

The demo distinguishes source evaluation, local software-rendered previews,
local validation, and deployed behavior. The feature branch was not deployed;
operational or hardware acceptance does not apply to these visualization
props.

## Verification

- Mesh/source audit: 70/70 pass with 2–4 distinct `.color()` arguments, two
  named presets, path/loft/profile geometry, and 196–592 triangles per asset.
  See [`quality-audit.json`](quality-audit.json) and its retained output.
- `npx eslint catalog/kits/shipyard/`: clean. See
  [`eslint-check.json`](eslint-check.json).
- `npx vitest run tests/integration/catalog/`: 4 files and 15 tests passed. See
  [`catalog-tests.json`](catalog-tests.json) and
  [`catalog-tests-output.txt`](catalog-tests-output.txt).
- The generated index contains 2,390 assets in 49 kits. All 70 shipyard source
  hashes, preview paths, controls, presets, origins, and triangle budgets pass
  [`catalog-index-check.json`](catalog-index-check.json).
- The local catalog hub and all 70 detail pages show the material controls,
  presets, and matching preview copies. See
  [`catalog-pages-check.json`](catalog-pages-check.json).
- `npm pack --dry-run --ignore-scripts --json` includes all 70 sources and
  previews. The source and built-package boundary audit found no commercial
  implementation paths, no commercial workflow code in built JavaScript, and
  no package export changes. See [`npm-pack-audit.json`](npm-pack-audit.json)
  and [`npm-package-boundary-audit.json`](npm-package-boundary-audit.json).
- Current read-only public checks returned HTTP 200 for the homepage and
  `/gallery.json`; `/catalog/` returned 404. This branch is not deployed, so no
  public behavior for these updated assets is claimed. See
  [`public-check.json`](public-check.json).

## Reproduction

Run from the repository root:

```bash
python3 artifacts/catalog-demos/shipyard-quality-20261104/promote_shipyard_assets.py
artifacts/catalog-demos/shipyard-quality-20261104/render_shipyard_previews.sh
python3 artifacts/catalog-demos/shipyard-quality-20261104/run_with_occt_cjs_compat.py --output catalog-build-after-previews-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/shipyard-quality-20261104/run_with_occt_cjs_compat.py --output quality-audit-output.txt -- npx tsx artifacts/catalog-demos/shipyard-quality-20261104/audit_shipyard_quality.ts
npx eslint catalog/kits/shipyard/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-shipyard-catalog-pages
python3 artifacts/catalog-demos/shipyard-quality-20261104/verify_shipyard_quality_pages.py
python3 artifacts/catalog-demos/shipyard-quality-20261104/verify_shipyard_index.py
python3 artifacts/catalog-demos/shipyard-quality-20261104/run_with_occt_cjs_compat.py --output variant-render-output.txt -- npx tsx artifacts/catalog-demos/shipyard-quality-20261104/render_quality_variant.ts
python3 artifacts/catalog-demos/shipyard-quality-20261104/capture_shipyard_quality.py
python3 artifacts/catalog-demos/shipyard-quality-20261104/inspect_shipyard_video.py
python3 artifacts/catalog-demos/shipyard-quality-20261104/run_npm_pack_audit.py
python3 artifacts/catalog-demos/shipyard-quality-20261104/audit_npm_package.py
```

The material and geometry workflow comparison, including current website/source
checks, is kept privately at
`kernelCAD-private/catalog-shipyard-compare-20261103/COMPARISON.md`.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/shipyard-quality-20261104/capture_shipyard_quality.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
