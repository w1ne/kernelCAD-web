# v0.8.0 — sdf-smooth-blend-bracket hero

## Hero artifact

sdf-smooth-blend-bracket — a plate-and-pin bracket where the cylinder-to-plate junction is a smooth 2 mm polynomial fillet, not a sharp seam. Built with `sdf.smoothBlend(sdf.box([30, 20, 4]), sdf.cylinder(5, 16), 2)` then materialized to a standard `Shape` via `sdf.materialize(field, { resolution: 25 })`.

## Why memorable

- Recognizable in one second: a plate with a cylindrical pin rising through it, where the pin/plate junction is a continuous fillet — visually obvious you couldn't have built this from `box + cylinder + union + .fillet()` alone.
- New tool central: the smooth blend is `sdf.smoothBlend(plate, pin, 2)`. Without the SDF authoring path the junction is a hard seam; smoothBlend is what makes the bracket smooth-blended.
- Reads at 360°: rotation reveals the smooth fillet wrapping continuously around the pin's base where it meets the plate's top face.

## What's new

This release adds signed-distance-field authoring to the agent surface. `sdf.sphere/.box/.cylinder/.torus` are callable distance closures with exact AABBs; `sdf.smoothBlend(a, b, k)` smoothly unions them with `k`-mm polynomial smoothing; `sdf.materialize(field, { resolution })` runs marching-cubes on the host and sews the triangle mesh into a closed polyhedral `Shape` (kind `sdfMaterialize`) that flows through booleans/STL/STEP exports. New `evaluate_sdf` MCP tool samples a named field at a 3D point for pre-materialize verification. Catalogue grows from 30 to 32 diagnostic codes; one new MCP tool (`evaluate_sdf`) brings the total to 34.

![Demo](./demo.mp4)
![Panel](./panel.png)
