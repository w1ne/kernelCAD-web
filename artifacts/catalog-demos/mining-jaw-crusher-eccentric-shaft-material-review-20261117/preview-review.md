# Five-preview semantic audit — 17 November 2026

Selected after checking PR #1258 and current open issues/PRs. None of these five
mining assets is targeted by an open issue or PR. The open-target snapshot is in
`verification/open-target-check.json`.

| Asset | Visible reading | Review |
|---|---|---|
| `cone-crusher-module` | Round blue crusher and hopper on a raised stand, with V-belt drive, hydraulic unit, handrail, and inclined ore conveyor. | Crusher coating, steelwork, rubber, and warning-painted service parts read as distinct materials; no mismatch selected. |
| `jaw-crusher-module` | Green primary crusher with a V-shaped jaw chamber, exposed eccentric shaft and flywheel, motor drive, raised stand, and discharge conveyor. | Finding: the eccentric shaft used the `manganeseSteel` jaw-liner control. It now uses `structuralSteel`; both jaw liners remain manganese. |
| `ball-mill` | Long cylindrical grinding shell on trunnion supports with drive equipment and service platform. | Shell, supports, drive, and ground slab have distinct plausible finishes; no mismatch selected. |
| `mine-locomotive` | Ochre narrow-gauge trolley locomotive with outside frame, flanged wheels, cab, buffer beams, track, and overhead contact wire. | Body coating, steelwork, rubber, and lamp/windscreen material remain distinct; no mismatch selected. |
| `mine-ventilation-fan` | Large axial fan casing and discharge stack connected to a mine shaft collar, with motor and electrical house. | Fan coating, structural steel, concrete, and electrical-house cladding read as separate materials; no mismatch selected. |

The source and named assembly parts were checked against each rendered preview.
The correction changes only the shaft's color-control assignment and the
asset's material-role description. Geometry, triangle count, parameters,
presets, and object identity are unchanged.
