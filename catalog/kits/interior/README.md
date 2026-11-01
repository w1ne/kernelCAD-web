# Interior kit

Low-poly furniture and room pieces for homes and offices, modelled at real-world
scale (seat height about 450 mm, tables 740–750 mm, doors 2040 mm) in millimetres
with Z up and exported as flat-shaded GLB in metres on one shared vertex-coloured
material. Every asset stands on z = 0 centred on x = y = 0 (the picture frame and wall shelf use
the `wall` origin: the back sits on the y = 0 plane, centred on the middle; the
pendant lamp uses the `ceiling` origin: the canopy top sits on z = 0 and it hangs
down along -Z). Fronts
face -Y. Each piece has choice knobs for counts, sizes and styles, colour knobs for
wood, fabric and metal zones, and a few presets (walnut, white, dark and similar).

| id | what it is | knobs | triangles (default) |
| --- | --- | --- | --- |
| `sofa` | Boxy upholstered sofa with seat and back cushions | seats (2/3), fabric, cushion, legs | 168 |
| `armchair` | Single upholstered lounge armchair | arm style, fabric, cushion, legs | 120 |
| `coffee-table` | Low coffee table, rectangular or round | shape, lower shelf, top, legs | 72 |
| `dining-table` | Four-legged dining table with apron | length (1.4/1.8/2.2 m), leg style, top, legs | 108 |
| `dining-chair` | Wooden dining chair with seat pad | back style, slat count, wood, pad | 120 |
| `bookshelf` | Open bookcase with optional books as coloured blocks | shelf levels (3–6), books, wood, books A, books B | 348 |
| `bed` | Bed with frame, headboard, mattress, blanket and pillows | size (single/double), frame, sheets, blanket | 132 |
| `nightstand` | Bedside table with drawers on legs | drawers (1–3), body, fronts, handles | 156 |
| `wardrobe` | Tall hinged-door wardrobe | doors (2–4), body, doors, handles | 120 |
| `desk` | Desk with modesty panel, panel legs or drawer pedestal | width (1.2/1.4/1.6 m), style, top, frame, handles | 156 |
| `office-chair` | Swivel chair on a five-star caster base | back height, armrests, upholstery, frame, column | 388 |
| `floor-lamp` | Standing lamp with faceted drum or cone shade | shade style, height, shade, metal | 84 |
| `table-lamp` | Table lamp with jar or column base | base style, base, shade | 96 |
| `rug` | Flat two-tone area rug | size (1.6x2.3/2x3/2.5x3.5 m), pattern, border, field | 60 |
| `potted-plant` | Houseplant in a tapered pot with faceted leaves | size, leaf count, pot, leaves, soil | 224 |
| `tv-stand-with-tv` | Media cabinet with a flat-screen TV | screen (43/55/65 in), cabinet, doors, TV frame, screen | 180 |
| `kitchen-counter` | Base cabinet run with worktop and optional sink | cabinets (2–4 x 600 mm), sink, cabinets, worktop, handles, steel | 236 |
| `fridge` | Upright fridge, combi or side-by-side | style, body, handles, base grille | 132 |
| `interior-door` | Interior door with lining, architraves and lever handles | leaf width (720/820/920), panel style, leaf, frame, handle | 312 |
| `wall-segment` | 2 m interior wall panel with skirting | opening (none/window/doorway), height, wall, skirting, glass | 140 |
| `picture-frame` | Wall-hung frame with mat and abstract picture | size, orientation, frame, mat, picture, accent | 128 |
| `bar-stool` | Bar or counter stool on splayed legs or a pedestal with footrest | seat height, base style, back, seat, frame | 164 |
| `rocking-chair` | Wooden rocking chair on curved rockers with armrests and spindle back | spindle count, cushion, wood, cushion colour | 364 |
| `bunk-bed` | Two-tier single bunk bed with ladder, guard rails and bedding | ladder side, frame, sheets, top and bottom blankets | 360 |
| `crib` | Baby crib with slatted sides, end boards, mattress and blanket | slats per side, wood, mattress, blanket | 420 |
| `chest-of-drawers` | Dresser with proud drawer fronts on legs or a plinth | drawers (3–5), width, base, handles, body, fronts, handles colour | 216 |
| `filing-cabinet` | Steel office filing cabinet with pulls, label holders and lock | drawers (2–4), body, fronts, handles | 168 |
| `corner-sofa` | L-shaped sectional with seat and back cushions | main-run seats (2–4), return seats, return side, fabric, cushions, legs | 252 |
| `ottoman` | Round faceted pouf or padded footstool on legs | style, size, fabric, accent | 112 |
| `side-table` | Round top on tripod or pedestal, or square table with shelf | style, height, top, legs | 100 |
| `round-table` | Round dining table on a pedestal with cross foot or four legs | diameter (0.8/1.1/1.4 m), base style, top, base | 260 |
| `wall-shelf` | Wall-mounted boards on brackets or floating, with books, vase and plant (`wall` origin) | boards (1–3), width, mounting, decor, board, bracket, decor A/B, plant | 372 |
| `pendant-lamp` | Ceiling pendant with dome, cone or drum shade and bulb (`ceiling` origin, hangs along -Z) | shade style, drop, shade, fitting, bulb | 300 |
| `desk-lamp` | Architect-style hinged-arm desk lamp with tilted cone shade | reach, arm and shade, base, bulb | 280 |
| `bathtub` | Freestanding roll-top tub on feet or built-in tub, with tap and water | style, water, tub, feet and tap, water colour | 232 |
| `toilet` | Close-coupled toilet with cistern, seat and closed or raised lid | lid, ceramic, seat, button | 334 |

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
