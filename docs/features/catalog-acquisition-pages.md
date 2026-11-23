# Catalog acquisition pages

Every catalog asset page is generated from `catalog/index.json` and its
original `catalog/kits/<kit>/<id>.kcad.ts` source. The static page preserves its
canonical URL, social preview image, Product and breadcrumb JSON-LD, and
sitemap entry.

## Visitor workflow

- A `<model-viewer>` shows the generated GLB with orbit and zoom controls. The
  preview image remains as a fallback if the viewer library cannot load.
- The page exposes the default model and each authored asset preset. Selecting
  a preset loads a separately generated GLB and updates the GLB download link.
  This is a static preset gallery: the page does not rebuild CAD in the
  browser. Open in Studio to change arbitrary knob values.
- GLB and deterministic STEP downloads are generated at site-build time. GLB
  follows the selected preset; STEP contains default values. The static host's
  `_headers` file gives each download an attachment filename.
- The MCP handoff states that hosted catalog lookup/fetch tools are not
  advertised today. It offers the public download URLs and the Studio deep
  link without naming a nonexistent tool.

The downloads are produced only by running the public kernelCAD `.kcad.ts`
sources through the kernelCAD exporter. The build checks the GLB structure,
nonzero triangle count, and each asset's `triangleBudget`. It does not read or
decimate third-party meshes.

## Build and local verification

```sh
npm run catalog:site
```

The default output is `site-build/`. Set `KCAD_CATALOG_OUT_DIR` to build into a
different directory. The build prints the asset page count, sitemap URL count,
and generated file counts. `npm run catalog:pages` remains the HTML-only
generator. Deployment is a separate step; local output does not establish
deployed behavior.
