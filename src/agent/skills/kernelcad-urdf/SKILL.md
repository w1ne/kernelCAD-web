---
name: kernelcad-urdf
description: Export multi-part assemblies to URDF — links, joints, inertial blocks, per-link STL meshes. Use when an assembly needs to be consumed by an external motion planner or simulator.
---

# kernelCAD — URDF export

URDF (Unified Robot Description Format) is a tree-shaped XML description of a multi-part assembly: links with inertial properties, joints with axes and limits, and visual + collision meshes. kernelCAD's `export_model({ format: 'urdf' })` writes a `.urdf` plus a sibling `meshes/` directory with one STL per link.

## When to use

- The assembly has at least one part and one joint or mate.
- The downstream consumer expects a tree topology (one parent per link).
- You need per-link mass, centre-of-mass, and inertia for dynamics simulation.

Not for: assemblies with closed kinematic loops (4-bar linkages, parallel grippers) — see `kernelcad-sdformat` for those.

## Quickstart

```typescript
const arm = assembly('two-link');
const base = arm.part('base', box(30, 30, 8), { density: 2700 });
const link = arm.part('link', box(80, 12, 8), { density: 2700 });
arm.revolute('shoulder', base, link, {
  axis: [0, 0, 1],
  origin: [0, 0, 8],
  limitsDeg: [-90, 90],
});
return arm.model();
```

Export via MCP:

```json
{ "tool": "export_model", "input": { "file": "two-link.kcad.ts", "format": "urdf", "output_path": "out/robot.urdf" } }
```

Result: `out/robot.urdf` containing one `<link>` per part and one `<joint>` per mate.

## Mate-to-joint mapping

| kernelCAD mate | URDF joint | Notes |
|---|---|---|
| `fastened` | `fixed` | Direct. |
| `revolute` with `limitsDeg` | `revolute` | Limits emitted in radians. |
| `revolute` without limits | `continuous` | Unbounded rotation. |
| `prismatic` with `limitsMm` | `prismatic` | Limits emitted in metres. |
| `planar` | `planar` | Native. |
| `cylindrical` | `revolute` (lossy) | Prismatic DOF dropped; `export.urdf.cylindrical-lossy`. |
| `ball` | 3-revolute chain (lossy) | Decomposed with dummy intermediate links; `export.urdf.ball-decomposed`. |
| `pin_slot` | `revolute` (lossy) | Slot translation DOF dropped; `export.urdf.pin-slot-lossy`. |

For lossy mappings switch to `format: 'sdf-gazebo'` if the downstream consumer accepts SDFormat — it supports `ball` natively and accepts closed loops.

## Inertia and density

Every link emits an `<inertial>` block computed via analytic mass-properties on the captured shape. Default density is 1000 kg/m³ (water) — wrong by ~8× for steel, ~2.7× for aluminum. Declare per-part density on `arm.part(name, shape, { density })` to get physically meaningful dynamics. The export emits `export.urdf.inertia-density-declared` as a warning for any link that inherits the default.

Typical values: steel `7850`, aluminum `2700`, ABS `1050`, brass `8500`, titanium `4500`.

## Closed loops

URDF requires a tree topology. If the assembly has a closed mate graph (e.g. a 4-bar linkage), `export_model({ format: 'urdf' })` refuses with `export.urdf.closed-loop`. Two paths forward:

1. Switch to `export_model({ format: 'sdf-gazebo' })` — supports closed loops natively.
2. Restructure the mate graph so each part has at most one parent.

## Verification gates

- `G-urdf-valid` — the exported `.urdf` parses cleanly via the `validate_urdf` MCP tool.
- `G-urdf-tree-shape` — no closed loops in the mate graph.
- `G-urdf-inertia-density-declared` — no link inherits the default density.

## Pre-export inspection

Call `inspect_robot({ file })` to preview what the export will emit before writing to disk. The tool returns the link / joint shape, declared planning groups, and any open issues (closed loops, missing density) the export would surface.

## Mesh format

Per-link STL by default. Mesh paths default to `package://kernelcad_export/meshes/<part>.stl`; override with `options.meshPrefix` for non-package consumers (e.g. `./meshes/`).
