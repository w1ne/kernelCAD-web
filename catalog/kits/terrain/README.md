# Terrain kit

Low-poly level-building pieces on a 2 m grid: floors, slopes, stairs, raised platforms, cliff corners, shorelines, farmland and a footbridge. Each asset is a parametric kernelCAD `.kcad.ts` program built from faceted polygon profiles (ruled lofts, extrusions, boxes), modelled in millimetres with Z up and the base on z = 0. It exports as a flat-shaded GLB in metres on one shared vertex-coloured palette material. Colour knobs become palette zones. Counts, sizes and styles are choice knobs, and most assets ship presets such as sandstone, dungeon, desert or snowy.

The tiles share the nature kit's grid: a 2 m x 2 m footprint with flat edges at a 0.2 m tile height (`compat: grid-2m`), so they sit next to `ground-tile`, `path-tile` and `cliff-tile`. Raised pieces step up in 0.5 m, 1 m or 2 m rises: the ramp and stair tiles climb from 0.2 m at the front (-Y) to 0.2 m plus the rise at the back edge, level with the top of a `stone-platform` of the same rise. The cliff corner keeps the straight cliff tile's foot line 0.35 m in front of the tile centre. The footbridge spans 2, 4 or 6 m along Y.

| id | what it is | knobs | triangles (default) |
| --- | --- | --- | --- |
| stone-floor-tile | 2 m paving of chamfered two-tone flagstones in mortar, grid or running bond | count, pattern, stone, stone2, mortar, dirt | 144 |
| sand-tile | 2 m beach or desert sand with a faceted dune or wind ripples and pebbles | relief, pebbles, sand, base, pebble | 272 |
| snow-tile | 2 m snow ground with a drift, frozen ice patch and rocks poking through | drift, icePatch, rocks, snow, ice, rock, dirt | 264 |
| ramp-tile | 2 m grassy slope rising to a raised back edge, dirt or stone footpath, rocks | riseM, track, rocks, grass, dirt, trackColor, rock | 192 |
| stair-tile | 2 m flight of stone steps between capped side walls | riseM, steps, walls, step, wall, cap | 180 |
| stone-platform | Raised 2 m block of coursed two-tone masonry with a flagstone top | riseM, block, block2, mortar, top | 792 |
| cliff-corner-tile | Stepped leaning rock cliff turning an inner (L-shaped plateau) or outer corner, fallen boulders | corner, heightM, steps, rock, rock2, grass, dirt | 280 |
| shore-edge-tile | Grass at the back, sloping sandy beach and shallow water at the front | beach, rocks, grass, sand, water, rock, dirt | 228 |
| farmland-tile | Ploughed field with soil furrows and sprouts, cabbages or wheat | rows, crop, soil, furrow, cropColor, dirt | 724 |
| wooden-bridge | Plank footbridge on stringers and posts with optional handrails | lengthM, deckM, rails, plank, beam, rail | 432 |

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
