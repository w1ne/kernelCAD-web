# NEMA 17 stepper-motor panel-mount plate

Design a parametric flat plate that holds a NEMA 17 stepper motor on a flat panel or surface.

## What the plate must do
- Accept a NEMA 17 stepper face (42 × 42 mm) with the standard four M3 mounting screws on a 31 mm bolt circle.
- Provide clearance for the motor's center boss (~22 mm diameter).
- Bolt down to the host panel via four M5 corner holes.

## Parameters
- Plate size, plate thickness, motor face size, bolt-circle diameter, motor boss diameter, M3 / M5 clearance hole diameters, panel-attach corner offset.

## Constraints
- Use only primitives, sketches, booleans, and translate at the v0.4 surface (no runtime rotation; motor axis = Z).
- All editable dimensions via `param()`; no literal numbers feed downstream geometry.
- All distances in mm.
