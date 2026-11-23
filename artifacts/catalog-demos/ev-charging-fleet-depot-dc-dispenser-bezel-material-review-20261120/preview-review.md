# Five-preview audit ledger: ev-charging-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` after the `origin/develop` merge (develop `2b2647675`).
Selection: unledgered EV assets whose `display-bezel` uses the `displayGlass` control
(`grep -l 'display-bezel.*color(displayGlass)'`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `charger-load-management-panel` | Reads as a floor cabinet with a screen and louvres. | Bezel and glass render as one pale block (`displayGlass`). `base-plinth` and `vent-slot-*` are `stainlessSteel`: the plinth should be concrete; the louvres are proud bars. | `cable-entry-skirt` is hidden inside the enclosure. |
| `curbside-ac-charger-post` | Reads as a tall post with a low cabinet and two cables. | Bezel on `displayGlass`. Connector cradles on `powderCoat`, no plug. | `main-enclosure` starts at z = 0 and swallows the ground plate; cables are horizontal rods that end in mid-air. |
| `destination-charging-pedestal` | Same template as the curbside post, wider. | Same as the curbside post. | Same as the curbside post. |
| `dual-outlet-wallbox` | Reads as a wall cabinet on a rail. | Both bezels on `displayGlass`; `second-display-bezel` has no glass and overlaps the first screen. | Holsters stick out sideways at the base, not on the front face. |
| `fleet-depot-dc-dispenser` | Reads as a tall DC dispenser with a roof visor and two cables. | **Fixed this round.** The 294 x 303 mm `display-bezel` used `displayGlass`, so the frame and the screen rendered as one pale panel. | Connector cradles are bare powder-coat stubs; cables are straight rods ending in mid-air; no "overhead cable guides" despite the description. |

Decision: fix `fleet-depot-dc-dispenser`, the largest screen of the five, with a new
`bezelPolymer` control (default `#1f2427`), the same pattern as `charger-status-display-post`
(`1c3fc03b7`). 16 EV assets still colour `display-bezel` with `displayGlass`.
