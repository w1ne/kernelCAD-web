# NEMA 17 stepper-motor panel-mount plate

Parametric flat plate that holds a NEMA 17 stepper motor on a flat host surface.

## What the plate is for
- Mounting a NEMA 17 stepper (42 × 42 mm face, 31 mm bolt circle, ~22 mm boss) so the motor axis is perpendicular to the host panel.
- Attaching the assembly to the host via four corner M5 screws.
- Adjusting for adjacent motor sizes (NEMA 14, NEMA 23) by editing `motorFace` and `boltCircle` together — the bore and bolt pattern follow.

## Source
- Paraphrased from a parametric NEMA 17 mount design on Printables: https://www.printables.com/model/1202979 ("NEMA17 stepper motor mount holder with parametric FreeCAD source", t-nissie).
- License inherited as CC BY 4.0 (Printables default for designs without an explicit override).

## kernelCAD features exercised
- `param()` editable parameters across nine dimensions.
- ParamRef arithmetic (`.add`, `.divide`, `.negate`) for derived hole positions and bore-height clearance.
- `box()` primitive for the plate body.
- `cylinder()` primitive used as a Z-axis through-bore.
- `.translate()` accepting ParamRef on every coordinate, so all hole positions stay parametric.
- `.subtract()` boolean composition for nine through-holes in one call.

## Notes
First seed entry under `examples/portfolio/`; hand-written to set the schema template for nine more entries to follow. Subsequent entries will be agent-driven through `npm run portfolio:attempt` then hand-cleaned.
