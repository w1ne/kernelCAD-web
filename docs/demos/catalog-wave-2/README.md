# Catalog wave 2 demo bundle

This bundle demonstrates the 12 source-authored assets in the outdoor-gear kit.
It shows the kit preview sheet, resolves three natural-language knob requests
through the catalog variant workflow, then exports and software-renders each
default and resolved variant at the same scale.

## Reproduce

From the repository root:

~~~sh
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts binoculars camp-chair camp-stove camping-backpack camping-hammock canteen fishing-rod hiking-boots map-case sleeping-bag trail-compass trekking-poles
npx tsx docs/demos/catalog-wave-2/generate.mts
~~~

The checked-in source is generate.mts; settings.json records the capture
size, frame rate, render mode and requested variants. The run writes
demo.mp4, poster.png and verification.json beside that source.

## Verification and limits

The verification file records the kit and catalog counts, per-asset triangle
ranges, every choice value built with its material and triangle count, the
exact resolved knobs and GLB hashes. The movie uses the catalog
MCP workflow and software renders of exported GLB triangles. It demonstrates
local source, index, knob resolution and export behavior. It does not claim a
live deployed page, engine import, simulation or hardware acceptance.

The public catalog route returned a page-not-found response during this
branch's website check. The static catalog-page generator is already present
in the source tree; verify the live catalog URL again after this branch is
deployed.

## Provenance

All 12 assets are original kernelCAD source dedicated to the public domain
under CC0 1.0. Their geometry is modeled from common object knowledge; no
downloaded meshes, textures, images or palettes are used.
