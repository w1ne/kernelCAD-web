# Dual-bearing hand coffee grinder (parametric)

`examples/gallery/hand-coffee-grinder.kcad.ts` is an original kernelCAD design
study of a manual conical-burr coffee grinder. The design idea it embodies:
cheap grinders hang the shaft from a single support bearing, so the inner
burr wobbles inside the outer burr and the grind is uneven. Here the drive
shaft is constrained by **two** deep-groove bearings, one in the lid above
the burrs and one in a three-spoke carrier below them, so the burrs stay
concentric. Grounds fall between the carrier spokes into the catch cup.

Inspired by a public post by industrial designer Louis Bateman on burr
concentricity; the geometry, proportions and styling here are our own.

## Parts (20)

`body-tube` (ground, knurled grip band), `catch-cup`, `lower-bearing-carrier`
(3 spokes), `detent-click-ring`, `bottom-bearing`, `outer-ring-burr`, `lid`,
`top-bearing`, `drive-shaft` (revolute `drive` about Z; threaded adjust
section, circlip grooves, hex drive), `inner-conical-burr`,
`grind-adjust-nut`, `preload-spring`, `spring-washer`, `circlip-lower`,
`circlip-top`, `crank-arm`, `crank-screw`, `knob-pin`, `walnut-knob`.

Bearings are real deep-groove ball bearings: grooved inner and outer races,
a ball set and a cage. The inner burr has 12 helical feed teeth (38 deg twist)
over a serrated fine-grind skirt; the ring burr has 24 matching internal
helical grooves (opposite hand). The adjust nut carries a modeled ISO 60 deg
internal thread (pitch 0.75, 0.05 play) on the shaft's modeled thread, plus 12
detent ridges that click into the stainless click ring under the carrier.

## Fits and manufacturability

| Interface | Fit (on radius) |
|---|---|
| bearing outer race in lid / carrier | N7-style press, modelled at nominal |
| shaft journal in inner race | g6-style slide, -0.006 (shaft slides for grind adjust) |
| inner burr bore on shaft | +0.01 |
| hex drive in crank socket | H8-style slip, +0.04 |
| adjust-nut thread | 0.05 play |
| cup spigot in body bore | -0.05 slip |

Body wall 2.5 mm (6061 tube), every turned edge chamfered (0.3-1.5 mm), crank
edges broken 1 mm. The burr/body constraint is enforced by the parameter
ranges: `bodyDiameter` 58-72 and `burrDiameter` 34-44 keep at least 3 mm of
outer-burr wall for every in-range pair, and set_param rejects out-of-range
values.

## Parameters

| Param | Default | Range | Effect |
|---|---|---|---|
| `bodyDiameter` | 58 | 58-72 | body tube, cup, lid, burr seat OD |
| `bodyLength` | 140 | 110-200 | tube length / hopper volume |
| `burrDiameter` | 40 | 34-44 | inner burr max diameter; ring burr bore follows |
| `bearingSize` | `608` | 608 / 688 / 626 / 6000 | both bearings, shaft, thread, hex, seats |
| `grindSetting` | 0.6 | 0-2 | axial drop of shaft + inner burr (coarser) |
| `crankLength` | 85 | 60-120 | crank arm length |
| `crankDeg` | 0 | +-180 | crank/shaft rotation (revolute mate) |
| `cutaway` | false | bool | solid half-section of housing, ring burr and bearings |
| `explode` | 0 | 0-1 | exploded view along the shaft; the tube steps aside |

## Run

```bash
npx tsx src/agent/cli/index.ts evaluate examples/gallery/hand-coffee-grinder.kcad.ts
npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --pose 35,18 --environment studio -o hero.png --no-watermark
npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --section y=0 --section-flip --pose 0,8 --environment studio -o section.png --no-watermark
# exploded: set explode = 1 (Studio slider / set_param), then render --pose 30,12
```

## Evidence

- `hero.png`: publish-preset product shot
- `section-y0.png`: `cutaway = true`; both bearings, spring, helical burr pair, threaded nut
- `exploded.png`: `explode = 1`
- Demo: `docs/demos/gallery/hand-coffee-grinder/demo.mp4`

The cutaway is real solid geometry. The renderer's `--section` clipping plane
draws no cap faces, so clipped solids look hollow / see-through; avoid it for
this model.

## Display simplifications

Bearing balls and cage are fused into the races (one solid per bearing); the
inner burr is fixed to the shaft without a modeled key; the detent spring
action is implied (ridges + notches); knob is fastened, not a revolute; the
knurl is a straight knurl crossed by grooves, not a rolled diamond knurl.
