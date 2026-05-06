# v0.4 - rocket keychain constrained-sketch demo

## Hero artifact

A flat extruded rocket keychain converted from the CC0 Wikimedia Commons `Rocket with boosters icon.svg`, then adapted into a printable charm with a rounded nose, mirrored fins, concentric porthole rings, and a keyring hole.

Source reference: <https://commons.wikimedia.org/wiki/File:Rocket_with_boosters_icon.svg>

## Why memorable

- **Recognizable in one second:** the converted booster-rocket silhouette, fins, circular window, and nose read as a rocket immediately.
- **New tool central:** symmetry, distance, angle, tangent, and concentric constraints define the converted profile and details. Remove the constraints and the design intent collapses into hand-placed points.
- **Reads at 360 degrees:** the flat charm rotates clearly; the porthole and keyring holes remain visible from top and iso views, while the extruded edge gives the object thickness.

## What's new

v0.4 adds constrained-sketch solving for agent workflows. Agents can now construct and solve POINT / LINE / CIRCLE sketches with constraints including `DISTANCE`, `ANGLE`, `TANGENT`, `CONCENTRIC`, and `SYMMETRIC`, then use the solved design intent to build an extruded part.

The MCP surface exposes:

- `list_constraints`
- `add_constraint`
- `solve_sketch`

This is an early constrained-sketch kernel, not a finished interactive CAD sketcher. The release focuses on deterministic agent-readable sketch constraints and a concrete proof artifact.
