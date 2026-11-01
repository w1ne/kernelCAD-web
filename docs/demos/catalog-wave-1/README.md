# Catalog wave 1 demo bundle

Wave 1 of the catalog growth adds 60 original parametric `.kcad.ts` assets in
five new kits under `catalog/kits/`: `tools-equipment`, `containers`,
`electronics`, `food-kitchen` and `lighting` (12 each). The catalog goes from
313 to 373 assets.

## Reproduce

```sh
npm run catalog:build      # catalog/index.json
npm run catalog:previews   # catalog/kits/<kit>/previews/*.png
npx tsx docs/demos/catalog-wave-1/generate.mts
```

`generate.mts` shows one contact sheet per new kit from the committed previews
(with each asset's knob count), then asks `get_variant` for three new assets
in plain words (`cooking-pot` "soup, copper", `ibc-tote` "wood pallet, 30
fill", `paper-lantern` "tall, table"), exports the returned source with
`style: 'lowpoly'` and renders defaults and variant at the same scale.
`verification.json` records the kit counts, triangle ranges, every variant's
resolved knobs and the variant GLB hashes.

## Verification

- `npx tsx scripts/checkCatalogAsset.ts` passes for all 60 assets at default
  knobs, and for every non-default choice value taken one at a time (185
  builds). Every knob combination (123 builds) was also checked for the 12
  assets whose worst single knob came within 5% of the triangle budget.
- `npx vitest run tests/integration/catalog/catalogIndex.test.ts`: 2/2 pass
  (budget, one material, standing on y = 0, fresh index).

## Provenance and scope

- Every asset is original kernelCAD source written for this catalog, CC0 1.0.
  No downloaded, traced or converted meshes, textures or palettes.
- Previews and the MP4 are software renders of the exported low-poly GLB
  triangles. They are **not** three.js renders and not engine import tests.
- Local validation only: no deployed behaviour is claimed.
