# Laboratory Infrastructure catalog wave demo

This bundle documents the 60 original assets in `catalog/kits/lab-infrastructure`.
The 18-second MP4 shows all assets across three readable index panels, followed
by three local catalog variant requests with default and resolved GLB meshes
rendered side by side from exported triangles.

**Video:** [demo.mp4](demo.mp4) — 1280×720 H.264. See the capture
[settings](settings.json), [verification record](verification.json),
[full-catalog page check](catalog-pages-check.json),
[catalog test output](catalog-test-output.txt), and
[preview contact sheet](preview-contact-sheet.png). The encoded video was
decoded and visually inspected; [inspection evidence](video-review/inspection.json)
includes the sampled frame sheet.

## Reproduce

From the repository root:

```sh
python3 -B artifacts/catalog-demos/lab-infrastructure-wave-20261102/generate_lab_infrastructure_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
npx tsx scripts/renderCatalogPreviews.ts $(node -e "const x=require('./catalog/index.json'); process.stdout.write(x.kits.find(k=>k.id==='lab-infrastructure').assets.join(' '))")
npx tsx artifacts/catalog-demos/lab-infrastructure-wave-20261102/check-pages.mts
npx tsx artifacts/catalog-demos/lab-infrastructure-wave-20261102/generate.mts
```

`generate.mts` queries the local catalog, confirms the catalog search for a
bench fixture, resolves the knob requests in `settings.json`, exports the
selected defaults and variants, checks their triangle budgets, material count
and base placement, then writes the movie, poster, contact sheet and evidence.
The integration test output separately records the full-catalog audit.

## Claims and limits

The recorded steps are local source generation, index building, lint,
integration checks, static catalog-page generation, catalog search and variant
resolution, GLB export and software rendering. They establish no live deploy,
simulation, lab safety, regulatory compliance or physical hardware acceptance.
The catalog assets are stylized scene-planning props, not engineering models of
real laboratory furniture or equipment.

## Provenance

All 60 models are original `.kcad.ts` sources dedicated to the public domain
under CC0 1.0. They use kernelCAD primitives; no downloaded or converted
meshes, textures, product images or palettes are included.
