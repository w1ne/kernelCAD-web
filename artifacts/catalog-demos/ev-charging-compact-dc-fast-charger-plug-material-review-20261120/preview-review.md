# Five-preview audit ledger: ev-charging-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `a35896c34`.
Selection: the three EV assets not yet in any audit ledger (`vehicle-to-grid-power-cabinet`,
`ccs-combo-2-connector`, `overhead-cable-management-boom`) plus two remaining bezel-pattern
candidates (`compact-dc-fast-charger`, `dual-port-ac-pedestal`). No open issue or PR targets
these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `compact-dc-fast-charger` | Reads as a floor-standing DC charger cabinet with two cables. | **Fixed this round.** Both plug handles and contact collars used `powderCoat`, so the plugs rendered as teal painted-steel blocks. | Cables are straight horizontal rods; plugs lie on their sides; `display-bezel` on `displayGlass`. |
| `vehicle-to-grid-power-cabinet` | Reads as a tall power cabinet with a window and vents. | Bezel on `displayGlass`; `base-plinth` and proud `vent-slot-*` bars are `stainlessSteel`. | `cable-entry-skirt` and `ground-terminal` are hidden inside the plinth and enclosure; no visible "bus-cable exits". |
| `dual-port-ac-pedestal` | Reads as a tall column on an enclosure base with two cables. | Bezel on `displayGlass`. Cradles already on `engineeringPolymer`. | Cables are straight rods ending in mid-air with no plug; `rear-control-panel` stands 5 mm clear of the column back. |
| `ccs-combo-2-connector` | Reads as a CCS2 plug: Type 2 head, DC shroud, loop grip, orange release button. | None; housing, overmould, plated pins and cable each have their own control. | None found. |
| `overhead-cable-management-boom` | Reads as a stainless mast with a swing arm and a hanging cable. | Mast, arm and pivot on `stainlessSteel` are plausible. | `cable-guide` and `balance-weight` both hang on the arm's far side; the cable ends mid-air with no connector. |

Decision: fix `compact-dc-fast-charger` with a `connectorPolymer` control (default `#2a3033`) on
both handles and contact collars. A charging plug body is moulded polymer; no other EV asset puts
`connector-handle` on `powderCoat` (`grep -l 'connector-handle.*powderCoat'`).
