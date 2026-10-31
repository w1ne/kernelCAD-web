# Catalog asset ES module demo bundle

`pine-tree.mjs` is the generated three.js ES module for the original catalog
asset `catalog/kits/nature/pine-tree.kcad.ts`
(`npx tsx scripts/exportAssetModule.ts pine-tree`).

```js
import createAsset, { params, presets, palette, meta, runtimeKnobs } from './pine-tree.mjs';
scene.add(createAsset());                       // the published asset
scene.add(createAsset({ leaves: '#c0392b' }));  // colour knob, applied at runtime
scene.add(createAsset({ preset: 'snowy' }));
```

The module imports `three` by bare specifier (bundler or import map). It
embeds the low-poly node tree and flat triangle positions, builds a
`THREE.Group` synchronously on one shared vertex-coloured material, and
recolours palette zones from colour knobs. A knob that changes geometry
throws with a message naming the bake path (`get_variant`, then `export` with
`style: 'lowpoly'`) instead of silently returning the default shape.

## Reproduce

```sh
npx tsx docs/demos/asset-module/generate.mts
```

This writes `pine-tree.mjs`, imports a copy with real three.js in Node, calls
`createAsset()` three ways and software renders the triangles of each returned
`THREE.Group` into `poster.png` / `demo.mp4`. `verification.json` records the
module size and hash.

## Provenance and scope

- Geometry is original kernelCAD source. No Polyfork downloads or meshes, no
  external meshes, and no mesh decimation are involved.
- The images are software renders of the module's own output in Node, **not**
  a browser render. Bundler and import-map loading in a browser is not tested
  here.
