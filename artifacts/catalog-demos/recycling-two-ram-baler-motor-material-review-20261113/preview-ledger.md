# Recycling-facility preview ledger — 2026-11-13

Selection rule: industrial/manufacturing assets in `recycling-facility` that no earlier
ledger under `artifacts/catalog-demos/*/preview-ledger.md` or `docs/quality/*.md` names,
and that no open issue or PR targets (open PR list and `recycling` issue search checked
on 2026-11-13).

| Asset | Preview reads as | Material check | Result |
|---|---|---|---|
| magnetic-drum-separator | Drum magnet over a vibratory pan, ferrous and non-ferrous chutes, two bins | Drum shell steel; magnet sector is a red paint marking on the end plate (labelled as marking) | No defect |
| granulator | Open cutting chamber, knife rotor, flywheel and V-belt drive, regrind bin | Rotor, bed knife and shaft steel; flywheel and motor dark drive colour; belt guard safety orange | No defect |
| horizontal-baler | Single-ram channel baler, open bale door, tied bale on roller table | Ram cylinder steel; door dark steel; lock wheel red | No defect |
| baghouse-collector | Bag housing on braced legs, pyramid hopper, airlock, fan and stack, caged ladder | Housing painted; ducting galvanised; rails safety yellow | No defect |
| compost-trommel-screen | Tracked trommel with mesh drum, hopper, fines and oversize conveyors | Drum core is a fixed dark tone that stands for the see-through mesh; hoops and bars use the steel knob | No defect (recorded: mesh core is not on the drum knob) |
| two-ram-baler (additional) | Two-ram baler with infeed belt, wire tier and roller table | **Power-pack electric motors `motor-0`/`motor-1` used the `hydraulics` knob ("Hydraulic cylinders (steel)")** | **Fixed** |

## Finding

The two power-pack electric motors on `two-ram-baler` rendered as bright cylinder
steel. In the preview they read as two more hydraulic rams on top of the cylinder
housing. A change to the hydraulic-cylinder colour also recoloured the motors. An
electric motor has a painted cast frame. The motors now use a new `motorPaint` knob
(default `#44515a`), set in all four presets. Geometry, 1,866 triangles and the
envelope do not change.

Recorded, not fixed: the `tieWire` label says it controls rollers, but the
`table-roller-*` parts use `hydraulics`. Both are steel, so the render is correct.
