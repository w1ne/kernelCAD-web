# Asset catalog demo bundle

Three original kits (nature, interior, city-street; 62 parametric `.kcad.ts`
assets under `catalog/kits/`) and real answers of the catalog MCP tools.

## Reproduce

```sh
npm run catalog:build      # catalog/index.json
npm run catalog:previews   # catalog/kits/<kit>/previews/*.png
npx tsx docs/demos/asset-catalog/generate.mts
```

`generate.mts` composes one contact sheet per kit from the committed previews,
then calls `search_assets` (a hit and an honest `coverage: none` gap),
`find_matching` and `get_variant` through the MCP tool registry, exports the
variant source with `style: 'lowpoly'` and renders defaults and variant at the
same scale. `verification.json` records every answer and the variant GLB hash.

## Provenance and scope

- Every asset is original kernelCAD source written for this catalog. No
  Polyfork downloads or meshes, no external meshes, textures or palettes, and
  no mesh decimation are involved (see each kit README).
- Previews and the MP4 are software renders of the exported low-poly GLB
  triangles (z-buffered, facet lighting). They are **not** three.js renders and
  not engine import tests.
- Local validation only: no deployed behaviour is claimed.
