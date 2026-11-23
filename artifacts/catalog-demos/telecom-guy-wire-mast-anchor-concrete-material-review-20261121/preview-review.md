# Five-preview audit ledger: telecom infrastructure, 2026-11-21

Audit base: `feat/catalog-2000` at `674e7037f`.
Selection: five telecom mast, earthing and cable-route assets not in any audit ledger
(`guy-wire-mast-anchor`, `grounding-rod-kit`, `fiber-dome-closure`, `cable-tray-elbow`,
`wall-mast-bracket`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `guy-wire-mast-anchor` | Reads as a grey mast on a teal disc with three wires that stop in mid-air, and three grey plates on the ground. | **Fixed this round.** The three ground anchors (`anchor-a/b/c`, 180 x 180 x 30 mm) were galvanized steel slabs lying on the surface, and the mast `base` was the only `powderCoat` part (teal painted steel). A guy anchor is a galvanized anchor rod set in a buried concrete deadman, and a mast stub stands on a concrete pier. | Fixed with the material: each guy ended at half the anchor distance (380 mm short, z 30 mm), so no wire reached an anchor; no turnbuckle or guy guard. |
| `grounding-rod-kit` | Reads as three copper rods joined by a copper bar, with grey clamps under the bar. | Weak: the `clamp-*` parts use the `stainlessSteel` control. Listed ground-rod (acorn) clamps are bronze; stainless on copper is not the normal fitting. | The bonding bar is a 45 x 45 mm solid copper bar standing 1,125 mm above the rod feet; rods show no ground line. |
| `fiber-dome-closure` | Reads as a dark upright closure with four cable ports at the base. | Plausible: moulded thermoplastic shell, polymer ports. | The 140 mm dome is a flat 8-sided cap; no clamp ring between dome and base. |
| `cable-tray-elbow` | Reads as an L-shaped grey tray with two dark cables per run. | Plausible: galvanized tray, polymer cable jackets. | `rail-a2` and `rail-b1` run across the inner corner and close the turn; the cables of the two runs do not connect through the bend; floor is a 50 mm solid slab. |
| `wall-mast-bracket` | Reads as a teal backplate with grey arms and two pale clamp cylinders. | Weak mixed finish: the `backplate` is `powderCoat` while the welded arms and gussets are galvanized. | The `clamp-*` parts are solid 85 mm-radius cylinders with no mast in them (best next geometry fix). |

Decision: fix `guy-wire-mast-anchor`. The `base` and `anchor-*` parts are removed. A new
`concrete` control (default `#a5a29a`) drives a 400 mm-diameter `pier` (120 mm high) and three
`deadman-*` blocks (240 x 240 x 40 mm above grade). The galvanized mast now stands on a 260 mm
`base-plate` on the pier and carries a `guy-band` at z 860 mm. Each guy runs from a galvanized
`anchor-rod-*` that rises out of its deadman, through a `turnbuckle-*`, to the band. A new
`guyGuard` control (default yellow `#e3b21b`) drives a guard sleeve on the low end of each guy.
The `powderCoat` control is removed. Triangles 256 -> 752 (budget 900).

Best next fixes: `wall-mast-bracket` (one finish for the welded bracket, clamps around a mast) and
`cable-tray-elbow` (open inner corner, a curved or mitred bend).
