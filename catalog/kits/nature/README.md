# Nature kit

Low-poly trees, plants, rocks, wood and 2 m terrain tiles at real-world scale. Each asset is a parametric kernelCAD `.kcad.ts` program built from faceted polygon profiles (ruled lofts, extrusions, boxes), modelled in millimetres with Z up and the base on z = 0. It exports as a flat-shaded GLB in metres on one shared vertex-coloured palette material. Colour knobs become palette zones. Counts, sizes and styles are choice knobs, and most assets ship presets such as autumn, dry, snowy or desert. The terrain tiles have a 2 m x 2 m footprint with edges at a 0.2 m tile height, so they line up on a 2 m grid (`compat: grid-2m`).

| id | what it is | knobs | triangles (default) |
| --- | --- | --- | --- |
| pine-tree | Stacked-cone conifer | heightM, tiers, sides, bark, leaves | 96 |
| oak-tree | Broad oak with stout trunk, limbs and a lumpy clustered crown | heightM, lumps, crown, bark, leaves | 288 |
| birch-tree | Slender white-barked birch with dark bands and a narrow crown | heightM, blobs, bark, bands, leaves | 212 |
| palm-tree | Coconut palm with curved ringed trunk, drooping fronds, coconuts | heightM, fronds, lean, trunk, frond, coconut | 338 |
| dead-tree | Bare dead tree with forked trunk, root flare, branches and twigs | heightM, branches, twigs, bark | 256 |
| bush | Rounded shrub of clustered faceted lumps, optional berries | size, lumps, berries, leaves, berry | 184 |
| fern | Fern rosette with arching three-piece fronds | size, fronds, frond, stalk | 240 |
| flower-patch | Wildflower clump with star-shaped heads on thin stems | count, heightM, petals, centre, leaves | 276 |
| grass-tuft | Clump of tall pointed grass blades | blades, heightM, grass, tips | 196 |
| cactus | Saguaro with faceted column, upturned arms, optional bloom | heightM, arms, bloom, body, flower | 204 |
| reeds | Waterside reeds and cattails on a mud mound | stalks, heightM, stalk, heads, mud | 140 |
| mushroom | Cluster of toadstools with dome, flat or conical caps and spots | count, size, shape, spots, cap, stem | 272 |
| rock | Squashed faceted field rock with a moss cap | size, shape, sides, stone, moss | 62 |
| boulder-cluster | One large boulder with smaller rocks around it | count, size, shape, stone, stone2 | 184 |
| log | Fallen log with cut end rings and a branch stub | lengthM, diameter, stub, bark, wood, heart | 120 |
| tree-stump | Sawn stump with flared roots, sapwood and heartwood top | diameter, height, roots, bark, wood, heart | 188 |
| ground-tile | 2 m grass tile with dirt edge and optional bumpy top | thickness, relief, grass, dirt | 56 |
| hill-tile | 2 m tile rising into a faceted grassy mound, optional rock | heightM, outcrop, grass, dirt, rock | 132 |
| path-tile | 2 m grass tile with a sunken dirt path (straight, corner, tee, cross) | layout, widthM, grass, path, dirt | 64 |
| water-tile | 2 m tile with a sunken pond or stream, sandy bank and water | shape, sizeM, grass, bank, water, dirt | 204 |
| cliff-tile | 2 m tile with a stepped rock cliff up to a grassy ledge | heightM, steps, rock, grass, dirt | 120 |

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
