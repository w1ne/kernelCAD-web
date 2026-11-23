# Industrial preview ledger — 2026-11-13

Selection rule: industrial/manufacturing assets that no earlier bundle under
`artifacts/catalog-demos/` samples or fixes, and that no open issue or PR targets
(open PR list and a PR search for the five IDs checked on 2026-11-13; no match).

| Asset | Preview reads as | Material check | Result |
|---|---|---|---|
| industrial-plant/cartridge-filter-housing | Vertical filter vessel, clamp-ring lid, side inlet, ladder | **`top-nozzle` and `side-nozzle` used `safetyPaint`; the `side-flange` on the same inlet used `steel`** | **Fixed** |
| industrial-plant/gantry-crane | Portable A-frame gantry with trolley and hook | Beam and legs steel; trolley and hook block safety paint; casters rubber | No material defect. Geometry recorded: tilted legs do not meet the bridge beam; casters sit mid-rail, not under the legs |
| water-treatment/belt-filter-press | Belt press with coated frame, blue filter belts, rollers, sludge chute, control panel | Frame coating, filter belt, stainless rollers and sludge cake on separate controls | No defect |
| shipyard/abrasive-blast-pot | Pressure pot on two wheels with hopper lid and handle | Vessel painted; wheels and hose outlet elastomer; handle steel | No material defect. Geometry recorded: vessel floats above ground between wheels; no axle or frame |
| grid-substation/substation-busbar-expansion-joint | Copper bus bars bridged by a flexible link on two supports | Conductors copper; supports galvanized; insulators porcelain | No material defect. Geometry recorded: porcelain insulators sit inside the support blocks and the conductor, only the top caps show |

## Finding

On `cartridge-filter-housing` the outlet nozzle on the lid and the neck of the side
inlet nozzle used the `safetyPaint` control. The inlet flange welded to that same
neck used `steel`. A nozzle is a pressure part welded to the shell; it carries the
shell material, not a safety marking. In the preview the lid outlet rendered as a
yellow stub. Both nozzles now use `steel`. The clamp ring, stiffener band, legs and
ladder rails keep `safetyPaint`. Geometry and 476 triangles do not change.

Recorded, not fixed: the description names a drain, but the model has no drain part.
