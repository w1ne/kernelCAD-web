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
| cliff-wall-tile | Straight stepped leaning rock cliff up to a grassy plateau, matching the cliff corner | heightM, steps, rock, rock2, grass, dirt | 248 |
| cobblestone-road-tile | 2 m road of staggered chamfered cobbles between kerbs and grass verges | widthM, cobbleSize, cobble, cobble2, kerb, verge, dirt | 600 |
| dirt-road-tile | Sunken meandering cart track with wheel ruts and a grassy centre, straight or corner | layout, widthM, grass, road, rut, dirt | 500 |
| rocky-ground-tile | Rough ground with gravel patches and half-buried faceted rocks | rocks, gravelPatches, ground, gravel, rock, rock2, dirt | 268 |
| swamp-tile | Murky bog water with mud islands, reeds, lily pads and a rotten snag | islands, reeds, snag, water, mud, reed, lily, wood | 428 |
| stepping-stones-tile | Stream between grassy banks crossed by flat faceted stepping stones | stones, streamM, grass, bank, water, stone, dirt | 208 |
| wooden-dock | Plank jetty on log piles with mooring posts, bracing and a ladder, 2-6 m | lengthM, deckM, ladder, plank, pile, rope | 544 |
| stone-arch-bridge | Humped masonry bridge with voussoir arch, paved deck and capped parapets, 4 or 6 m | lengthM, parapets, stone, ring, deck, cap | 324 |
| palisade-wall | 2 m section of sharpened log stakes on rear rails and an earth bank | heightM, logs, bank, log, point, rail, earth | 356 |
| stone-wall-section | 2 m coursed stone wall with through-stones and capstones, intact or ruined | heightM, style, block, block2, mortar, cap | 516 |

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
