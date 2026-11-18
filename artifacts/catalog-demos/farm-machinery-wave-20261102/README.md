# Farm Machinery catalog wave demo

This bundle documents the 60 original assets in `catalog/kits/farm-machinery`.
The 18-second MP4 shows all assets across three index panels, followed by three
local catalog variant requests with default and resolved GLB meshes rendered
side by side from exported triangles.

**Video:** [demo.mp4](demo.mp4) — 1280×720 H.264. See the capture
[settings](settings.json), [verification record](verification.json),
[full-catalog page check](catalog-pages-check.json),
[catalog test output](catalog-test-output.txt), and
[preview contact sheet](preview-contact-sheet.png). The encoded video is decoded
and visually inspected; see [inspection evidence](video-review/inspection.json)
and its sampled frame sheet.

## Reproduce

From the repository root:

```sh
python3 -B artifacts/catalog-demos/farm-machinery-wave-20261102/generate_farm_machinery_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
npx tsx scripts/renderCatalogPreviews.ts $(node -e "const x=require('./catalog/index.json'); process.stdout.write(x.kits.find(k=>k.id==='farm-machinery').assets.join(' '))")
npx tsx artifacts/catalog-demos/farm-machinery-wave-20261102/check-pages.mts
npx tsx artifacts/catalog-demos/farm-machinery-wave-20261102/generate.mts
```

The asset generator writes original `.kcad.ts` source. `generate.mts` queries the
local catalog, checks search coverage, resolves the knob requests in
`settings.json`, exports defaults and variants, checks triangle budgets,
material count and base placement, and writes the movie, poster, contact sheet
and evidence. The integration output records the full-catalog audit.

## Claims and limits

The evidence covers local source generation, index build, lint, integration
audit, static catalog-page generation, local catalog search and variant
resolution, GLB export and software rendering. Live deployment, equipment
simulation, field performance, safety standards and hardware acceptance are
not established. These are stylized scene-planning props, not engineering
models or manufacturer-specific product replicas.

## Provenance

All 60 models are original low-poly `.kcad.ts` sources dedicated to the public
domain under CC0 1.0. They use kernelCAD primitives and include no downloaded
or converted meshes, textures, manufacturer branding or product imagery.
