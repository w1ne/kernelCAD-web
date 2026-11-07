# Standard Components

Original parametric low-poly components for workshop, industrial and mechanical scenes. Each asset is authored as a standalone kernelCAD `.kcad.ts` model in millimetres, with its base on Z = 0 and its X/Y bounds centered. The models are generic scene assets rather than vendor part-number geometry.

Every asset has a compact, standard or large model-size choice, a finish color knob, and dark and brass presets. Each exports with one palette material and a bounded low-poly triangle budget.

## Assets

| ID | Component | Description | Default triangles |
| --- | --- | --- | ---: |
| `angle-bracket` | Angle bracket | Low-poly right-angle mounting bracket with two drilled legs and a reinforcing web. | 232 |
| `base-mounting-plate` | Base mounting plate | Square equipment mounting plate with four corner holes and a raised locating boss. | 264 |
| `beam-coupling` | Beam coupling | Slender beam-style flexible shaft coupling with two end hubs and a slotted center sleeve. | 428 |
| `blind-flange` | Blind flange | Solid round blind pipe flange with four recessed mounting-hole bores. | 296 |
| `bulkhead-adapter` | Bulkhead adapter | Hollow through-wall adapter with a tube barrel and a flange on each side. | 288 |
| `cable-clamp` | Cable clamp | Low-profile cable saddle with two fixing ears and a rounded cable guide. | 132 |
| `cable-gland` | Cable gland | Panel cable gland with a hollow body, stepped compression nut and wide sealing flange. | 384 |
| `caster-wheel` | Caster wheel | Single low-poly swivel caster with a fork, mounting plate and centered wheel. | 200 |
| `clevis-pin` | Clevis pin | Round headed clevis pin with a straight shank and cross-hole collar. | 156 |
| `din-rail` | DIN rail | Short symmetric top-hat rail profile with a flat web and raised edge lips. | 48 |
| `din-rail-end-stop` | DIN rail end stop | Small rail-end stop with a raised clamp block and front-facing tightening boss. | 80 |
| `din-rail-terminal-block` | DIN rail terminal block | Single terminal block body with top access wells and a stepped rail foot. | 120 |
| `door-hinge` | Door hinge | Two-leaf butt hinge with a full-height hinge barrel and alternating knuckle bands. | 244 |
| `drawer-slide-channel` | Drawer slide channel | Nested low-poly slide rails with C-channel lips for a telescoping drawer track. | 60 |
| `flange-bearing-housing` | Flange bearing housing | Square two-hole bearing mount with a raised round boss and a centered shaft opening. | 212 |
| `flat-joining-plate` | Flat joining plate | Flat strap plate with a row of four mounting holes for joining two parts in line. | 220 |
| `gusset-bracket` | Gusset bracket | Triangular shelf-support bracket with a broad wall plate, horizontal toe and solid diagonal web. | 32 |
| `handle-pull` | Handle pull | Raised U-shaped cabinet pull with two mounting feet and a straight grip bar. | 220 |
| `handwheel` | Handwheel | Three-spoke handwheel with a raised center hub and a clear circular rim. | 176 |
| `hose-barb-adapter` | Hose barb adapter | Stepped hose-barb adapter with a hollow center and three grip ribs. | 448 |
| `jaw-coupling` | Jaw coupling | Two jaw hubs with a visible flexible center spider between the shaft bores. | 236 |
| `knurled-knob` | Knurled knob | Compact control knob with a broad grip body, raised crown and center stem. | 228 |
| `leveling-foot` | Leveling foot | Adjustable leveling foot with a wide circular pad and centered support stem. | 132 |
| `linear-guide-carriage` | Linear guide carriage | Block-shaped linear carriage with a recessed underside channel and raised top pad. | 40 |
| `linear-guide-rail` | Linear guide rail | Compact linear motion rail with a broad mounting foot and raised central raceway. | 232 |
| `panel-clamp` | Panel clamp | Small edge clamp with a broad base, upright jaw and adjustable pressure pad. | 80 |
| `piano-hinge` | Piano hinge | Long continuous hinge with two flat leaves and alternating knuckles along the pin. | 288 |
| `pillow-block-housing` | Pillow block housing | Raised pillow-block support with a broad base, round bearing boss and two bolt feet. | 132 |
| `pipe-coupling` | Pipe coupling sleeve | Short hollow straight coupling sleeve with raised end collars. | 288 |
| `pipe-elbow-45` | 45 degree pipe elbow | Angled 45 degree pipe connector with open ends and a thicker low-poly center bend. | 236 |
| `pipe-elbow-90` | 90 degree pipe elbow | Low-poly 90 degree elbow fitting with two hollow perpendicular pipe ends. | 236 |
| `pipe-flange` | Pipe flange | Round slip-on pipe flange with a center bore and four bolt-hole positions. | 400 |
| `pipe-reducer` | Pipe reducer | Stepped hollow reducer joining a larger pipe end to a smaller pipe end. | 288 |
| `pipe-saddle-clamp` | Pipe saddle clamp | Two-piece saddle clamp with a curved seat, twin side lugs and a mounting foot. | 132 |
| `pipe-tee` | Pipe tee fitting | Three-way T pipe fitting with a vertical run and perpendicular side branch. | 192 |
| `pipe-union` | Pipe union | Compact union fitting with two hollow sockets and a broad central hex-like nut body. | 256 |
| `retaining-ring` | Retaining ring | Open retaining ring profile with two small installation ears. | 124 |
| `rubber-bumper` | Rubber bumper | Low-profile cylindrical vibration bumper with a flat base and centered mounting stem. | 132 |
| `shaft-collar` | Shaft collar | One-piece round shaft collar with a centered bore and a small radial set-screw boss. | 140 |
| `shaft-coupling` | Shaft coupling sleeve | Straight shaft coupler with a thicker center band and two aligned shaft bores. | 288 |
| `shim-pack` | Shim pack | Stack of thin rectangular alignment shims with small offset pull tabs. | 60 |
| `split-shaft-collar` | Split shaft collar | Split clamp collar with a through bore and a raised clamp lug. | 112 |
| `square-mounting-flange` | Square mounting flange | Square flange with a centered through bore, four corner holes and a short neck. | 316 |
| `t-slot-angle-bracket` | T-slot angle bracket | Compact external corner bracket for joining two perpendicular framing profiles. | 40 |
| `t-slot-end-cap` | T-slot end cap | Square profile end cap with a shallow face and four short locating ribs. | 60 |
| `timing-belt-pulley` | Timing belt pulley | Toothed low-poly belt pulley with two retaining flanges and a centered shaft bore. | 288 |
| `tube-clamp` | Tube clamp | Compact two-hole clamp block with a semicircular tube seat and a top retainer bridge. | 48 |
| `tubular-spacer` | Tubular spacer | Short hollow cylindrical spacer with flat faces and a centered clearance bore. | 96 |
| `u-bracket` | U bracket | Open-top channel mounting bracket with a flat back and two parallel side ears. | 80 |
| `v-belt-pulley` | V-belt pulley | Stepped V-belt pulley with two shallow belt grooves and a through bore. | 384 |

## Validate and preview

From the repository root, validate every source and rebuild the catalog outputs:

```sh
bash catalog/kits/standard-components/demo/validate-assets.sh
npm run catalog:build
npm run catalog:previews
```

For one source and a quick PNG check:

```sh
npx tsx scripts/checkCatalogAsset.ts catalog/kits/standard-components/angle-bracket.kcad.ts --png /tmp/angle-bracket.png
```

## Demo bundle

The [workflow demo](demo/workflow.mp4) shows the local source → validation → catalog preview workflow. The [demo notes](demo/README.md), [settings](demo/settings.json), [validation invocation](demo/validate-assets.sh), [video source](demo/make-demo.sh), and [verification logs](demo/) retain the source and evidence.

The video covers local catalog validation and rendering only. Public deployment is pending PR merge; no physical hardware acceptance was performed.

## Licence

Every source in this kit is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The catalog metadata sets `license: "CC0-1.0"` on each asset.

## Provenance

All geometry is original kernelCAD source written for this catalog. No downloaded, traced, converted or decimated meshes, textures or palettes are used.
