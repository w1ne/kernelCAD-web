# Catalog wave 2 demo bundle

This bundle demonstrates the 12 source-authored assets in the outdoor-gear kit.
It shows the kit preview sheet, resolves three natural-language knob requests
through the catalog variant workflow, then exports and software-renders each
default and resolved variant at the same scale.

**Video:** [demo.mp4](demo.mp4) — 16 seconds, 1280×720 H.264. The decoded
frames and [contact sheet](video-review/decoded-contact-sheet.png) were
inspected after encoding; see the [inspection record](video-review/inspection.json).
[poster.png](poster.png) previews the kit overview.

## Reproduce

From the repository root:

~~~sh
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts binoculars camp-chair camp-stove camping-backpack camping-hammock canteen fishing-rod hiking-boots map-case sleeping-bag trail-compass trekking-poles
npx tsx docs/demos/catalog-wave-2/generate.mts
npx tsx docs/demos/catalog-wave-2/check-pages.mts
~~~

The checked-in source is generate.mts; settings.json records the capture
size, frame rate, render mode and requested variants. The run writes
demo.mp4, poster.png and verification.json beside that source. The page check
builds all static catalog pages into a temporary directory and records its
result in catalog-pages-check.json.

## Verification and limits

The verification file records the kit and catalog counts, per-asset triangle
ranges, every choice value built with its base height, material and triangle
count, the exact resolved knobs and GLB hashes. The page check records all 12
outdoor-gear pages, including their preview, Studio link, triangle count and
exact knob names. [Local page review](local-page-review.json) records the
browser inspection of a generated page and the live catalog's 404 response.
The movie uses the catalog MCP workflow and software renders of exported GLB
triangles. It demonstrates local source, index, knob resolution and export
behavior. It does not claim a live deployed page, engine import, simulation or
hardware acceptance.

On 2026-11-02, `https://kernelcad.com/catalog/` returned HTTP 404 and a
page-not-found response. The static catalog-page generator is already present
in the source tree; verify the live catalog URL after this branch is deployed.

## Provenance

All 12 assets are original kernelCAD source dedicated to the public domain
under CC0 1.0. Their geometry is modeled from common object knowledge; no
downloaded meshes, textures, images or palettes are used.
