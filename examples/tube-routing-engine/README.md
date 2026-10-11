# Tube routing around an engine envelope

Five bent tubes in three fluid systems, routed between ports on an engine-like assembly and checked against bending and clearance rules.

![Five tubes routed around the case and gearbox](engine-lines.png)

Blue is hydraulic, orange is fuel, yellow is oil.

## What is in it

`engine-lines.kcad.ts` builds seven parts and five tubes. The case axis is X: forward is -X (the inlet), aft is +X (the nozzle), Z is up, and the accessory side is -Y.

| Part | What it is | Ports |
|---|---|---|
| `case` | 300 mm cylinder, 600 mm long, with flanges and mounting pads | `oil-in` |
| `gearbox` | box under the case, oil boss on its aft face | `oil-out` |
| `pump` | fuel pump on the accessory side of the gearbox | `out-a`, `out-b` |
| `manifold` | hydraulic manifold on the accessory side of the gearbox | `a`, `b` |
| `actuator-1`, `actuator-2` | cylinders on the accessory side of the case, forward and aft | `in` |
| `fuel-block` | fuel inlet block on the accessory side of the case, aft | `in-a`, `in-b` |

| Line | System | OD (mm) | From | To | Bends | Cut length (mm) | Nearest neighbour |
|---|---|---|---|---|---|---|---|
| `fuel-a` | fuel | 12.7 | `pump.out-a` | `fuel-block.in-a` | 2 | 309.29 | 12.30 mm to `fuel-b` |
| `fuel-b` | fuel | 12.7 | `pump.out-b` | `fuel-block.in-b` | 2 | 309.29 | 12.30 mm to `fuel-a` |
| `hyd-a` | hydraulic | 9.525 | `manifold.a` | `actuator-1.in` | 2 | 216.45 | 23.81 mm to `manifold` |
| `hyd-b` | hydraulic | 9.525 | `manifold.b` | `actuator-2.in` | 2 | 306.45 | 17.75 mm to `fuel-b` |
| `oil-feed` | oil | 6.35 | `gearbox.oil-out` | `case.oil-in` | 2 | 224.65 | 15.88 mm to `case` |

The rules are `tubeSpec({ clearance: { default: 6, pairs: [{ a: 'fuel', b: 'hydraulic', min: 12 }] } })` with the default bend rules: bend radius at least 3 x OD, 2 x OD straight between bends, 2.5 x OD straight at each end.

Each boss is fused to the part that owns the port. The tube may touch that part along the end straight the rule requires; everywhere else it is measured against it like any other part.

## Run it

Build the CLI once with `npm run build:cli`, then:

```bash
node dist/cli/index.js evaluate examples/tube-routing-engine/engine-lines.kcad.ts --json
node dist/cli/index.js export bend-table examples/tube-routing-engine/engine-lines.kcad.ts -o out/bend-tables
```

`evaluate` prints `"ok": true`, an empty `diagnostics` list and a `tubes` object with `lines` (five entries) and `systems` (three). `export bend-table` writes one CSV per tube into the directory. This is `hyd-b.csv`:

```
name,hyd-b
od_mm,9.525
wall_mm,0.89
bend_radius_mm,28.6
cut_length_mm,306.450

point,x_mm,y_mm,z_mm
1,0.000,0.000,0.000
2,66.000,0.000,0.000
3,66.000,190.000,0.000
4,141.000,190.000,0.000

bend,l_mm,r_deg,a_deg
1,37.400,0.000,90.000
2,132.800,180.000,90.000
last_straight_mm,46.400
```

The points are in the tube's own frame: the first point at the origin and the first leg along +X. Each bend row gives the straight before the bend, the rotation of the bend plane from the previous bend, and the bend angle.

The image was rendered with:

```bash
node dist/cli/index.js render examples/tube-routing-engine/engine-lines.kcad.ts --preset publish --no-watermark -o examples/tube-routing-engine/engine-lines.png
```

## Moving a part

The pump, the manifold, both actuators and the fuel block are placed by parameters (`PumpX`, `ManifoldX`, `Actuator1X`, `Actuator2X`, `FuelBlockX`), and the corners next to them use the same parameters. The gearbox and the case stay at the origin, so the ends of the oil line are fixed.

| Change | Result |
|---|---|
| `PumpX` 60 to 90 | passes; `fuel-a` and `fuel-b` shorten from 309.29 mm to 279.29 mm |
| `Actuator2X` 130 to 160 | passes; `hyd-b` grows from 306.45 mm to 336.45 mm |
| `PumpX` 60 to 150 | fails; the pump is now 85 mm from the fuel block |

The last change produces, for each fuel line:

```
tube.straight.between-bends-too-short: tube 'fuel-a' leg 1 has 8.80 mm straight between bends; the rule needs 25.40 mm.
```

The hint says to move the two corners apart by the shortfall, 16.6 mm. Setting `FuelBlockX` from 235 to 252 does that, and the script passes again with both fuel lines at 236.29 mm.

## How it was routed

Three evaluations. The first set of corners passed every gate, so no diagnostic had to be acted on while routing; the second and third evaluations followed changes to the parts and also passed. The diagnostic that was acted on is the `tube.straight.between-bends-too-short` above, from moving the pump, fixed by moving `FuelBlockX` by the stated shortfall.

## The broken twin

`engine-lines-broken.kcad.ts` is the same script with the second corner of `hyd-b` 8 mm lower, toward the fuel lines that run under it.

```bash
node dist/cli/index.js evaluate examples/tube-routing-engine/engine-lines-broken.kcad.ts --json
```

It fails with one error:

```
tube.clearance.violated: tube 'fuel-b' is 11.24 mm from 'hyd-b'; the rule needs 12.00 mm. Closest point on the tube: [101.40, -195.01, -133.97]; on 'hyd-b': [101.40, -191.49, -123.29].
```

A pair of tubes is reported once, on the tube declared first, so the message names `fuel-b` although the corner that moved belongs to `hyd-b`. `export bend-table` on this script writes nothing and prints the same error.

## A branch

`engine-lines-branch.kcad.ts` is the same engine with one hydraulic outlet on the manifold. `hyd-main` runs from the manifold to actuator 2, and `hyd-branch` tees off it and runs to actuator 1:

```typescript
from: { tube: 'hyd-main', at: teeAt, axis: [0, -1, 0] },
```

`at` is the station of the tee, in mm along the trunk centreline from the trunk's `from` end: the first straight, the first bend, then the distance along the run. The script writes it from the same parameters that place the trunk, so the tee stays at `TeeX` when `ManifoldX` or `HydRunZ` changes. `axis` is the direction the branch leaves along, square to the trunk leg.

```bash
node dist/cli/index.js evaluate examples/tube-routing-engine/engine-lines-branch.kcad.ts --json
```

It reports no diagnostics. `hyd-branch` has `from: { tube: 'hyd-main', at: 113.72 }` and a cut length of 393.41 mm, measured from the wall of `hyd-main`; `hyd-main` has `branches: [{ tube: 'hyd-branch', at: 113.72 }]`, and its bend-table CSV ends with:

```
branch,at_mm
hyd-branch,113.725
```

The branch is cut to the outer wall of the trunk, so the two solids touch and do not overlap. The trunk is not drilled.

| Change | Result |
|---|---|
| `TeeX` 0 to 40 | passes; the tee moves 40 mm aft and `hyd-branch` grows by 40 mm |
| `TeeX` 0 to -20 | fails `tube.branch.too-close`: the tee is 11.40 mm from bend 1 of the trunk and the rule needs 19.05 mm |

