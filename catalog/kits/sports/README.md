# Sports kit

Forty original low-poly sports props for court, field, racket, skating, fitness and award scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every source retains its editable `scale` parameter and now exposes 2–4 material-named color controls plus the `clubColors` preset. These assets are generic scene props; they do not claim sport ratings, dimensional certification or hardware acceptance.

The models and rendered previews are native kernelCAD assets dedicated to the public domain under CC0 1.0. The [sports quality-promotion demo bundle](../../../artifacts/catalog-demos/sports-quality-promotion-20261105/README.md) retains the migration source, before/after previews, preset renders, checks and inspected MP4.

Basketballs and practice balls show their panel seams; rackets separate frame, string and grip materials; goals and nets use open cord grids; fitness equipment distinguishes grip surfaces, rubber weights, frame metal and upholstery. Controls change material colors while preserving each object's shape. The treadmill, gym bench, field hockey stick, starting block and batting helmet are rebuilt at about real size from oriented members, extruded profiles and lofts, each with a fourth material control and extra presets; the gym bench also exposes its backrest position.

| id | asset | material controls | triangles / budget |
| --- | --- | --- | ---: |
| `american-football` | American football | Pebbled leather · Ivory lacing · End stripe paint | 126 / 600 |
| `badminton-racket` | Badminton racket | Graphite frame · Nylon strings · Grip rubber | 312 / 600 |
| `barbell` | Barbell | Chrome steel · Bumper plate rubber · Knurled grip steel | 200 / 600 |
| `baseball` | Baseball | Ball cover · Red stitching | 654 / 800 |
| `baseball-bat` | Baseball bat | Maple bat wood · Grip tape · End-grain wood | 176 / 600 |
| `baseball-glove` | Baseball glove | Glove leather · Palm lining · Lace cord | 446 / 600 |
| `basketball` | Basketball | Pebbled ball cover · Channel rubber | 654 / 800 |
| `basketball-hoop` | Basketball hoop | Powder-coated steel · Backboard polycarbonate · Rim steel · Net nylon | 704 / 900 |
| `batting-helmet` | Batting helmet | Helmet shell polymer · Impact foam · Face guard steel · Decal and stripe | 2304 / 3000 |
| `cricket-bat` | Cricket bat | Willow bat wood · Rubber grip · Edge tape | 136 / 600 |
| `cricket-wicket` | Cricket wicket | Wicket timber · Ground rubber · Bail paint | 168 / 600 |
| `dumbbell` | Dumbbell | Knurled handle steel · Rubber weights | 88 / 600 |
| `exercise-ball` | Exercise ball | Exercise ball vinyl · Reinforced seam tape · Valve polymer | 410 / 600 |
| `foam-roller` | Foam roller | EVA roller foam · Core polymer | 236 / 600 |
| `golf-bag` | Golf bag | Bag nylon fabric · Rim aluminium · Club steel · Strap webbing | 312 / 600 |
| `golf-club` | Golf club | Club-head stainless steel · Graphite shaft · Grip rubber | 100 / 600 |
| `gym-bench` | Gym bench (backrest position: flat / incline / steep / upright) | Vinyl upholstery · Frame steel · Foot rubber · Adjuster metal | 1052 / 1600 |
| `hockey-puck` | Hockey puck | Vulcanized puck rubber · Face rubber | 140 / 600 |
| `hockey-stick` | Field hockey stick | Composite shaft · Blade tape · Grip tape · Graphic accent | 1288 / 1600 |
| `inline-skate` | Inline skate | Synthetic boot fabric · Frame aluminium · Urethane wheels · Molded cuff polymer | 270 / 600 |
| `jump-rope` | Jump rope | Braided nylon rope · Handle polymer · Grip foam | 272 / 600 |
| `kettlebell` | Kettlebell | Cast iron body · Handle steel | 290 / 600 |
| `lacrosse-stick` | Lacrosse stick | Graphite shaft · Head polymer · Pocket nylon | 334 / 600 |
| `shuttlecock` | Shuttlecock | Cork tip · Skirt nylon · Crown binding tape | 160 / 600 |
| `skateboard` | Skateboard | Maple deck · Truck aluminium · Urethane wheels | 348 / 600 |
| `soccer-ball` | Soccer ball | Ball cover · Panel polymer | 274 / 800 |
| `soccer-goal` | Soccer goal | Goal aluminium · Net nylon · Ground rubber | 1228 / 1400 |
| `sports-water-bottle` | Sports water bottle | Bottle stainless steel · Cap polymer · Silicone grip band | 264 / 600 |
| `starting-block` | Track starting block | Anodized aluminium · Pedal frame · Pedal rubber · Spike steel | 1324 / 1600 |
| `tennis-ball` | Tennis ball | Felt cover · Seam tape | 366 / 800 |
| `tennis-net` | Tennis net | Powder-coated steel · Net nylon · Base rubber | 436 / 600 |
| `tennis-racket` | Tennis racket | Graphite frame · Nylon strings · Grip tape | 288 / 600 |
| `track-hurdle` | Track hurdle | Anodized aluminium · Crossbar polymer · Foot rubber | 124 / 600 |
| `treadmill` | Treadmill | Frame steel · Running belt rubber · Console glass · Hood plastic | 948 / 1600 |
| `trophy-cup` | Trophy cup | Gold-plated metal · Walnut base · Engraving inlay | 320 / 600 |
| `volleyball` | Volleyball | Ball panel fabric · Seam tape · Panel accent fabric | 654 / 800 |
| `volleyball-net` | Volleyball net | Powder-coated steel · Mesh nylon · Top safety band · Base rubber | 472 / 600 |
| `weight-plate` | Weight plate | Cast iron plate · Bore sleeve steel · Weight marking paint | 204 / 600 |
| `yoga-block` | Yoga block | EVA foam · Textured grip foam | 72 / 600 |
| `yoga-mat` | Yoga mat | Foam rubber mat · Carry webbing · Edge binding | 104 / 600 |

## Rebuild and verify

The first command below restores the original, single-color wave sources. Use this sequence only when replaying the promotion from that baseline.

```sh
python3 artifacts/catalog-demos/sports-wave-20261102/generate_sports_assets.py
python3 artifacts/catalog-demos/sports-quality-promotion-20261105/promote_sports_quality.py --apply
npx tsx scripts/renderCatalogPreviews.ts american-football badminton-racket barbell baseball baseball-bat baseball-glove basketball basketball-hoop batting-helmet cricket-bat cricket-wicket dumbbell exercise-ball foam-roller golf-bag golf-club gym-bench hockey-puck hockey-stick inline-skate jump-rope kettlebell lacrosse-stick shuttlecock skateboard soccer-ball soccer-goal sports-water-bottle starting-block tennis-ball tennis-net tennis-racket track-hurdle treadmill trophy-cup volleyball volleyball-net weight-plate yoga-block yoga-mat
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit sports
npx eslint catalog/kits/sports/
npx vitest run tests/integration/catalog/
```

## Licence and provenance

Every asset and export is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is authored from scratch in kernelCAD. The private design comparison is retained in `kernelCAD-private`; it contributes no copied geometry, textures, logos or product-specific dimensions.
