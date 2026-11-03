# Industrial Plant catalog wave demo

This bundle documents the 60 original assets in `catalog/kits/industrial-plant`.
The short MP4 shows the complete kit in three readable index panels, then runs
three real local catalog variant requests and compares their default and
resolved GLB meshes. The meshes are software-rendered from exported triangles.

**Video:** [demo.mp4](demo.mp4) — 1280×720 H.264. See the capture
[settings](settings.json), [verification record](verification.json),
[catalog page check](catalog-pages-check.json) and
[preview contact sheet](preview-contact-sheet.png). The audit output is
[catalog-test-output.txt](catalog-test-output.txt). The video was decoded and
visually inspected after encoding; [inspection evidence](video-review/inspection.json)
and its [decoded frame sheet](video-review/decoded-contact-sheet.png) record the review.

## Reproduce

From the repository root:

```sh
python3 -B artifacts/catalog-demos/industrial-plant-wave-20261102/generate_industrial_plant_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
npx tsx scripts/renderCatalogPreviews.ts $(node -e "const x=require('./catalog/index.json'); process.stdout.write(x.kits.find(k=>k.id==='solar-energy').assets.join(' '))")
npx tsx scripts/renderCatalogPreviews.ts $(node -e "const x=require('./catalog/index.json'); process.stdout.write(x.kits.find(k=>k.id==='industrial-plant').assets.join(' '))")
npx tsx artifacts/catalog-demos/industrial-plant-wave-20261102/check-pages.mts
npx tsx artifacts/catalog-demos/industrial-plant-wave-20261102/generate.mts
```

The full catalog audit also includes the solar-energy wave that preceded this
kit. `generate.mts` reads the checked-in index and previews, queries the local
catalog MCP tools, resolves the knob requests in `settings.json`, exports the
default and resolved models, checks their triangle budgets, material count and
base placement, then writes the movie, poster, contact sheet and evidence.

## Claims and limits

The recorded steps are local source generation, catalog indexing, lint,
integration checks, static catalog-page generation, catalog search and variant
resolution, GLB export and software rendering. They establish no simulation,
hardware acceptance or deployed-page behavior. This branch has not been
deployed; verify the live catalog and Studio route after merge and deployment.
The industrial objects are low-poly scene props and are not engineering models
of real plant equipment.

## Provenance

All 60 models are original `.kcad.ts` sources dedicated to the public domain
under CC0 1.0. They use kernelCAD primitives; no downloaded or converted
meshes, textures, images or palettes are included.
