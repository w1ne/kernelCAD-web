# Five-preview audit ledger: ev-charging-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `f9f35b0a8`.
Selection: unledgered EV assets whose `display-bezel` uses the `displayGlass` control
(`grep -l 'display-bezel.*color(displayGlass)'`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `high-power-charge-dispenser` | Reads as a tall DC dispenser with a roof visor and two cables. | **Fixed this round.** The 350 x 326 mm `display-bezel` used `displayGlass`, so frame and screen rendered as one pale panel. The bezel also stood 1 mm clear of the enclosure face. | Connector cradles are bare powder-coat stubs; cables are straight rods that end in mid-air. |
| `dual-connector-dc-dispenser` | Same template as the high-power dispenser, narrower, with a front door. | Bezel on `displayGlass`. | Same cradle and cable limits; no "cable loops" despite the description. |
| `ev-service-disconnect-cabinet` | Reads as a cabinet with a handle and a meter window. | Bezel on `displayGlass`. Disconnect handle and guard are grey `engineeringPolymer`; no red/yellow operating handle. | `cable-entry-skirt` is hidden inside the enclosure. |
| `ev-site-distribution-panel` | Reads as a wide three-door panelboard. | Bezel on `displayGlass`. `base-plinth` and proud `vent-slot-*` bars are `stainlessSteel`. | Conduit stubs and `cable-entry-skirt` are hidden inside the plinth and enclosure. |
| `outdoor-charger-switchboard` | Same template as the distribution panel, larger. | Same as the distribution panel. | Same as the distribution panel. |

Decision: fix `high-power-charge-dispenser`, whose description names a "broad screen", with a
`bezelPolymer` control (default `#1f2427`), the pattern from `1c3fc03b7` and `f9f35b0a8`. Seat the
bezel on the enclosure face (depth 22 -> 23 mm, centre y -262 -> -261.5 mm). 15 EV assets still
colour `display-bezel` with `displayGlass`.
