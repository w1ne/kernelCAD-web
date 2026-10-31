# Authoring catalog assets

Catalog assets are original, parametric low-poly models for games and three.js
scenes. Each one is a `.kcad.ts` program in `catalog/kits/<kit>/<id>.kcad.ts`
that exports as a flat-shaded GLB in metres with one shared vertex-coloured
material. `catalog/index.json` is generated from these sources; never edit it
by hand.

## Provenance

Model every asset from scratch in kernelCAD. No downloaded, traced, converted
or decimated meshes, textures or palettes from any other asset store or
product. Real-world references (photos of real benches, real tree species,
standard furniture sizes) are fine. Every kit README states this.

## File contract

```ts
meta({
  name: 'park-bench',            // must equal the file name
  title: 'Park bench',
  description: 'One sentence a search can match: what it is and its knobs.',
  tags: ['bench', 'seat', 'park', 'street'],
  kit: 'city-street',            // must equal the folder name
  category: 'furniture',         // prop|furniture|building|structure|vehicle|nature|terrain|item|attachment|character|animal
  origin: 'base',                // base (default) | center | wall | ceiling
  compat: ['outdoor', 'street'], // matching tags shared across kits
  triangleBudget: 400,           // the build fails above this
});
```

- Model in **millimetres, Z up**, at real size. With `origin: 'base'` the
  model stands on z = 0, centred on x = y = 0. The GLB converts to metres and
  Y up.
- **Knobs**: colours are `param('seat', '#8a5a33', { label: 'Seat' })` and
  pass straight to `.color(ref)`. Counts, sizes that drive loops, and styles
  are **choice** params with string options (`param('slats', '4', { choices:
  ['3', '4', '5'] })`, then `Number(slats.value)`). Numeric params are
  symbolic: use them only where an API accepts a ParamRef, with
  `.add/.multiply`, never JS arithmetic. Give every knob a `label`.
- Add `presets({ name: { knob: value } })` for 1–3 useful looks when they make
  sense (autumn, night, worn, painted).
- Build with an `assembly()` and one `part()` per colour zone or moving piece
  when that helps. Each distinct colour becomes a palette zone named after its
  colour knob.
- **Low-poly look**: use polygon profiles (`path().moveTo().lineTo()…close()`
  then `.extrude()` or `.loft(other, { spacing, ruled: true })`), boxes,
  `extrudePolygon`, `cylinder(h, r)` (faceted at export), and `sphere(r)`
  scaled with `.scale([sx, sy, sz])` for rocks and bushes. Avoid fillets,
  threads and text: they cost triangles and read as CAD, not as a game asset.
- Budgets that keep scenes cheap: small props 40–300, furniture 100–600, trees
  and large props 80–600, building pieces up to 1500.

## Check and preview

```sh
npx tsx scripts/checkCatalogAsset.ts catalog/kits/<kit>/<id>.kcad.ts --png /tmp/<id>.png
npm run catalog:build      # rebuild catalog/index.json
npm run catalog:previews   # rebuild catalog/kits/<kit>/previews/*.png
```

Look at the preview. A test fails when the index is stale, an asset is over
budget, needs a second opaque material, or does not stand on y = 0.
