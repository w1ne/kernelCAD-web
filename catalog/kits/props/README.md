# Props kit

Low-poly crates, barrels, containers, tools, carts and market pieces at real-world scale, for village, farm, warehouse, dock and street scenes. Each asset is a parametric kernelCAD `.kcad.ts` program built from faceted polygon profiles (ruled lofts, extrusions, boxes), modelled in millimetres with Z up and the base on z = 0. It exports as a flat-shaded GLB in metres on one shared vertex-coloured palette material. Colour knobs become palette zones. Counts, sizes, styles and loads are choice knobs, and most assets ship presets such as weathered, painted or rusty.

| id | what it is | knobs | triangles (default) |
| --- | --- | --- | --- |
| wooden-crate | Cubic shipping crate with raised edge battens and diagonal or cross face braces | size, brace, planks, battens | 204 |
| barrel | Bulging stave barrel with iron hoops and a sunken lid | size, hoops, sides, wood, iron, lid | 316 |
| sack | Slumped burlap sack, rope-tied or rolled open over its contents | size, style, cloth, rope, contents | 148 |
| oil-drum | 200-litre steel drum with rolled rims, rolling hoops, band and bungs | top, sides, drum, rim, band | 388 |
| toolbox | Metal toolbox with handle and latches, or an open wooden tote with tools | style, size, body, handle, trim | 124 |
| anvil | Blacksmith anvil with face, heel and horn, on a log stump or the floor | stand, size, iron, face, stump | 128 |
| ladder | Straight rung ladder or folding A-frame step ladder | style, rungs, rail, rung | 184 |
| pallet | EUR 1200 x 800 pallet, empty or stacked with cardboard boxes | load, wood, blocks, boxes | 240 |
| wheelbarrow | One-wheel barrow with flared tray, handles and legs, empty or heaped | load, tray, frame, tyre, soil | 248 |
| hand-cart | Two-wheeled wooden cart with slatted sides, spoked wheels and shafts | sides, load, spokes, wood, wheel, iron, cargo | 556 |
| market-stall | Counter stall on four posts under a striped sloping awning with valance | widthM, stripes, goods, wood, awningA, awningB, produce | 432 |
| treasure-chest | Vaulted-lid chest with iron bands and lock, shut or open over gold | lid, size, wood, iron, gold | 168 |
| shipping-container | Corrugated ISO container (10/20/40 ft) with corner frame and barred double doors | lengthFt, ribs, steel, frame, bars | 408 |
| gas-cylinder | Steel gas bottle with painted shoulder and valve, single or a chained pair | count, size, bottle, shoulder, valve | 208 |
| jerrycan | Steel fuel can with X-pressed sides, three-bar handle and spout cap | can, press, handle, cap | 180 |
| bucket | Tapered metal or wooden pail with bail handle, empty or filled | style, fill, body, rim, contents | 332 |
| watering-can | Garden watering can with long angled spout, rose head and handle | can, rose, grip | 228 |
| haybale | Rectangular twine-bound or big round straw bale, single or stacked | shape, stack, hay, ends, twine | 140 |
| campfire | Crossed logs in a stone ring with layered flames, or cold embers | state, stones, wood, stone, flame, core | 338 |
| lantern | Hexagonal glowing lantern with pointed roof, free-standing or on a post | mount, frame, glass, post | 164 |
| tent | Canvas ridge tent with open door, poles and guy lines, or a round pavilion | style, canvas, trim, inside, poles | 128 |
| signpost | Crossroads signpost with arrow finger boards on a stone footing | arrows, post, boards, footing | 124 |
| workbench | Carpenter workbench with shelf, front vice and tools on top | lengthMm, tools, top, frame, metal | 220 |
| plastic-crate | Stackable slotted plastic crate with hand-holds, optionally full of produce | stack, contents, crate, rim, goods | 232 |
| well | Round stone village well with gabled roof, winch and hanging bucket | roof, stone, cap, wood, shingles, water | 460 |
| cauldron | Pot-bellied iron cauldron on three legs with bubbling brew, optional fire | fire, size, iron, brew, wood | 364 |
| hand-truck | Two-wheeled dolly with looped handle and toe plate, empty or with boxes | load, frame, tyre, plate, boxes | 372 |
| barrel-stack | Pyramid of barrels lying on their sides on wooden chocks | count, wood, iron, lid, chock | 408 |
| cardboard-boxes | Askew pile of taped cardboard boxes with labels, optional open top box | count, open, card, tape, label | 352 |
| water-trough | Splayed livestock water trough, planked on legs or carved stone | style, lengthMm, body, band, water | 112 |
| beehive | Stacked wooden box hive with gabled roof on a stand, or a straw skep on a stool | style, supers, boxC, roof, stand, entrance | 188 |
| notice-board | Village quest board on two posts with pitched roof and pinned notices | widthM, notices, roof, wood, board, roofC, paper | 156 |
| axe | Woodcutter or double-bitted battle axe lying flat as a pickup | style, length, head, edge, haft | 100 |
| tool-rack | Free-standing rack with shovel, pitchfork, rake and pickaxe | tools, frame, handle, metal | 380 |
| weapon-rack | Armoury rack of swords and spears with a leaning round shield | swords, spears, shield, wood, steel, grip, shieldC | 332 |
| scarecrow | Pole scarecrow with shirt, straw tufts, sack head and straw hat | hatStyle, pole, shirt, patch, head, hat, straw | 324 |
| covered-wagon | Pioneer wagon with arched canvas, driver seat, tongue and four spoked wheels | cover, wood, wheel, canvas, opening | 524 |

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
