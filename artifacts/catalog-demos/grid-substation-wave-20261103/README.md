# Grid substation catalog wave

This bundle records the source, generated catalog models, preview workflow,
local validation, and short browser walkthrough for the 80 asset
`grid-substation` kit.

## Source and invocation

- `generate_grid_substation_assets.py` generates the 80 native `.kcad.ts` files,
  kit metadata, and kit README from the authored asset recipes.
- `settings.json` records the source parameters, catalog target count, preview
  command, and bounded browser capture settings.
- Regenerate the models with:

  ```sh
  python3 artifacts/catalog-demos/grid-substation-wave-20261103/generate_grid_substation_assets.py
  ```

## Verification

The index contains the asset statistics and source hashes. `source-and-preview-audit.json`
records source hash, mesh, material, parameter, base-origin, triangle-budget,
and preview checks for the wave. `catalog-build-after-previews-output.txt`
records the final index build and audit totals. `catalog-pages-check.json` records the local
generated hub and detail-page checks. `integration-catalog-test.txt` records
the required integration suite, and `npm-pack-audit.json` records the package
boundary check.

The short `grid-substation-demo.mp4` walks through the generated local catalog
hub, an asset detail page with its parameter table, and a scale variant rendered
from the same parametric CAD source. The local static build uses the captured
public kernelCAD stylesheet and favicon in `public-site-style.css` and
`public-site-favicon.svg`; `settings.json` records their URLs and SHA-256 hashes.
`capture_grid_substation_demo.cjs`,
`assemble_demo_video.py`, and `settings.json` preserve the procedure. The
capture attaches to the existing Chrome/CDP profile, uses a temporary tab, has
a 45 second idle timeout and 160 second lifetime, and closes only its own tab.
The MP4 is inspected after capture; see `demo-inspection.json` and
`preview-review/demo-frame-contact-sheet.png` for its verified dimensions and
representative frames.

## What this proves

The checks cover native source loading, parameter exposure, mesh generation,
triangle budgets, single-material output, indexed previews, source hashes, and
local generated pages. They do not establish that this feature branch is
deployed, or prove equipment ratings, electrical safety, grid compliance,
switching procedures, or field acceptance.
