# Sports kit

Forty original low-poly assets for court, field, racket, skating, fitness and award scenes. Each source is a self-contained `.kcad.ts` model in millimetres, uses `origin: 'base'`, and is dedicated to the public domain under CC0 1.0. Every asset exposes `scale` (0.65–1.35) and `color` knobs and exports with one material under its declared triangle budget. These are stylized scene props, not sport-rated or dimensionally certified equipment.

The sources and generated previews are native kernelCAD assets. The [sports wave demo bundle](../../../artifacts/catalog-demos/sports-wave-20261102/README.md) retains the generation source, local verification evidence, capture settings and inspected MP4.

| id | asset |
| --- | --- |
| `basketball` | Basketball |
| `basketball-hoop` | Basketball hoop |
| `soccer-ball` | Soccer ball |
| `soccer-goal` | Soccer goal |
| `american-football` | American football |
| `baseball` | Baseball |
| `baseball-bat` | Baseball bat |
| `baseball-glove` | Baseball glove |
| `batting-helmet` | Batting helmet |
| `tennis-racket` | Tennis racket |
| `tennis-ball` | Tennis ball |
| `tennis-net` | Tennis net |
| `volleyball` | Volleyball |
| `volleyball-net` | Volleyball net |
| `badminton-racket` | Badminton racket |
| `shuttlecock` | Shuttlecock |
| `cricket-bat` | Cricket bat |
| `cricket-wicket` | Cricket wicket |
| `hockey-stick` | Field hockey stick |
| `hockey-puck` | Hockey puck |
| `lacrosse-stick` | Lacrosse stick |
| `golf-club` | Golf club |
| `golf-bag` | Golf bag |
| `skateboard` | Skateboard |
| `inline-skate` | Inline skate |
| `jump-rope` | Jump rope |
| `dumbbell` | Dumbbell |
| `kettlebell` | Kettlebell |
| `barbell` | Barbell |
| `weight-plate` | Weight plate |
| `yoga-mat` | Yoga mat |
| `yoga-block` | Yoga block |
| `exercise-ball` | Exercise ball |
| `foam-roller` | Foam roller |
| `gym-bench` | Gym bench |
| `treadmill` | Treadmill |
| `starting-block` | Track starting block |
| `track-hurdle` | Track hurdle |
| `sports-water-bottle` | Sports water bottle |
| `trophy-cup` | Trophy cup |

## Rebuild and verify

```sh
python3 artifacts/catalog-demos/sports-wave-20261102/generate_sports_assets.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/sports-wave-20261102/render_sports_previews.py
npx eslint catalog/
npx vitest run tests/integration/catalog/
```

## Licence and provenance

The geometry is modeled from scratch in kernelCAD with built-in primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included. Sources and exports are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
