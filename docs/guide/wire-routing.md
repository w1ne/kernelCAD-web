# Wire route analysis

Use the `route_wires` MCP tool for a first-pass pin-to-pin path estimate. It
accepts a LabWired `labwired-kernelcad-handoff/0.1` envelope or explicit wire
records with 3D endpoint coordinates in millimetres. LabWired handoff pin
coordinates are treated as board-frame coordinates as supplied. Part bounding
boxes are transformed from their local boxes using their position and rotation;
parts without a known placement or bounding box make clearance analysis
incomplete and produce a warning.
The handoff provides XY pin coordinates and often XY-only part placements, but
does not define their world Z. Without `board_surface_z_mm`, XY endpoints are
placed at Z=0 for an estimate and XY-only part boxes are omitted; the tool marks
clearance as incomplete. When supplied, the parameter places XY endpoints at
the board surface and makes XY-only part boxes extend upward from that surface.
Use it only when the board surface height is known in the same world frame as
the part boxes.

```json
{
  "handoff": { "schema": "labwired-kernelcad-handoff/0.1", "parts": [], "wires": [] },
  "clearance_mm": 1,
  "bend_radius_mm": 2
}
```

Each resolved wire gets an orthogonal route, polyline length,
bend count and collision list. Explicit `obstacles` can add other axis-aligned
volumes. `collisions` identifies intersections with the original physical
obstacle bounds; `clearance_violations` identifies intersections with bounds
expanded by wire radius and requested clearance. Either list makes `ok` false.
Missing or null endpoint positions are counted and returned as
warnings; they are never guessed. A reported route is geometric analysis only:
it is not stored in the Studio document, rendered as wire geometry, simulated,
or accepted as a physical harness. The requested bend radius is returned as
metadata and does not certify bend-radius compliance.
Malformed obstacle bounds are rejected. If route search exceeds its bounded
visibility graph or cannot find a collision-free path, the route has
`route_found: false`, empty points, and a `route_failure` reason; it is never
returned as a usable fallback route.
