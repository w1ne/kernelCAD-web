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

## Parts (13)

`body-tube` (ground), `catch-cup`, `lower-bearing-carrier`, `bottom-bearing`,
`outer-ring-burr`, `lid`, `top-bearing`, `grind-adjust-nut`, `drive-shaft`
(revolute `drive` about Z), `inner-conical-burr`, `preload-spring`,
`crank-arm` (hex socket on the shaft's hex drive), `crank-knob`.

## Parameters

| Param | Default | Range | Effect |
|---|---|---|---|
| `bodyDiameter` | 52 | 46–70 | body tube, cup, lid, burr seat OD |
| `bodyLength` | 140 | 110–200 | tube length / hopper volume; lid, top bearing, crank follow |
| `burrDiameter` | 38 | 32–46 | inner burr max Ø; outer burr bore follows (keep ≥ 8 mm under `bodyDiameter`) |
| `bearingSize` | `608` | 608 / 688 / 626 / 6000 | both bearings, shaft Ø, hex drive, seats |
| `grindSetting` | 0.6 | 0–2 | axial drop of the rotating stack (coarser grind) |
| `crankLength` | 85 | 60–120 | crank arm length |
| `crankDeg` | 0 | ±180 | crank/shaft rotation (revolute mate) |
| `explode` | 0 | 0–1 | exploded view along the shaft; the tube steps aside |

## Run

```bash
npx tsx src/agent/cli/index.ts evaluate examples/gallery/hand-coffee-grinder.kcad.ts
npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --pose 35,18 --environment studio -o hero.png --no-watermark
npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --section y=0 --section-flip --pose 0,8 --environment studio -o section.png --no-watermark
# exploded: set explode = 1 (Studio slider / set_param), then render --pose 30,12
```

## Evidence

- `hero.png` — assembled iso; `views.png` — front/right/top/iso sheet
- `section-y0.png` — half section: lid + top bearing, spring and collar,
  conical burr pair, bottom bearing in the spoke carrier, adjust nut, cup
- `exploded.png` — `explode = 1`

`evaluate`: 68 features, OK, no diagnostics (default params, `explode = 1`,
and a 64/110/44/6000/grind 2 variant).

## Display simplifications

Bearings are single shielded rings (no balls); burr teeth are straight axial
flutes, not helical cutting geometry; the adjust nut is modeled unthreaded;
the lid is a plain slip cap. Tolerances are line-to-line display fits, not
the CNC fits a production drawing would call out.
