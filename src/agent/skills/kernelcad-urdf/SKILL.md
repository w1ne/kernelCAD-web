---
name: kernelcad-urdf
description: Export multi-part assemblies to URDF — links, joints, inertial blocks, per-link STL meshes. Use when an assembly needs to be consumed by an external motion planner or simulator.
---

# kernelCAD — URDF export

URDF (Unified Robot Description Format) is a tree-shaped XML description of a multi-part assembly: links with inertial properties, joints with axes and limits, and visual + collision meshes. kernelCAD's `export({ target: 'model', format: 'urdf' })` writes a `.urdf` plus a sibling `meshes/` directory with one STL per link.

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
base.connector('shoulderAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 8] }, axis: [0, 0, 1] });
link.connector('shoulderAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('shoulder', 'base.shoulderAxis', 'link.shoulderAxis', 'revolute', { limitsDeg: [-90, 90] });
return arm.model();
```

Export via MCP:

```json
{ "tool": "export", "input": { "target": "model", "file": "two-link.kcad.ts", "format": "urdf", "output_path": "out/robot.urdf" } }
```

Result: `out/robot.urdf` containing one `<link>` per part and one `<joint>` per mate, plus `out/meshes/<part>.stl` for every link (reported in the tool's `mesh_files`). Ship the whole directory: the visual/collision tags reference the meshes by the configured prefix.

## Geometry units

Link STL meshes are written in kernelCAD-native mm; every `<mesh>` tag carries `scale="0.001 0.001 0.001"` so consumers see metres — consistent with the SI `<inertial>` blocks and joint origins. Do not strip the scale attribute.

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

Every link emits an `<inertial>` block computed via analytic mass-properties on the captured shape. Default density is 1000 kg/m³ (water) — wrong by ~8× for steel, ~2.7× for aluminum. Prefer naming a **material** on `arm.part(name, shape, { material })` (`steel` | `aluminum`/`aluminium` | `pla` | `abs` | `pet`) — it seeds the density from the catalog (and a matching render finish) in one word. Or pass a raw `{ density }` in kg/m³ for a value outside the catalog; the explicit number overrides the material's. The export emits `export.urdf.inertia-density-declared` as a warning for any link that inherits the default (no material and no density).

```typescript
const base = arm.part('base', box(30, 30, 8), { material: 'aluminum' }); // 2700 kg/m³
```

Typical raw densities: steel `7850`, aluminum `2700`, ABS `1050`, brass `8500`, titanium `4500`.

## Closed loops

URDF requires a tree topology. If the assembly has a closed mate graph (e.g. a 4-bar linkage), `export({ target: 'model', format: 'urdf' })` refuses with `export.urdf.closed-loop`. Two paths forward:

1. Switch to `export({ target: 'model', format: 'sdf-gazebo' })` — supports closed loops natively.
2. Restructure the mate graph so each part has at most one parent.

## Verification gates

- `G-urdf-valid` — the exported `.urdf` parses cleanly via the `verify({ check: 'urdf' })` MCP tool.
- `G-urdf-tree-shape` — no closed loops in the mate graph.
- `G-urdf-inertia-density-declared` — no link inherits the default density.

## Pre-export inspection

Call `inspect({ of: 'robot', file })` to preview what the export will emit before writing to disk. The tool returns the link / joint shape, declared planning groups, and any open issues (closed loops, missing density) the export would surface.

## Mesh format

Per-link STL by default. Mesh paths default to `package://kernelcad_export/meshes/<part>.stl`; override with `options.meshPrefix` for non-package consumers (e.g. `./meshes/`).

## USD physics stage export (`format: 'usd-isaac'`)

When the consumer is a GPU physics / robot-learning stack that imports UsdPhysics directly, skip the URDF round-trip: `export({ target: 'model', format: 'usd-isaac' })` writes an ASCII USD (`.usda`) root layer plus one `meshes/<link>.usda` mesh layer per link, next to `output_path` (reported in `mesh_files` — ship the whole directory). Author the assembly exactly as for URDF: parts, connectors, `fastened` / `revolute` / `prismatic` mates, and a density or named `material` per part.

```json
{ "tool": "export", "input": { "target": "model", "file": "two-link.kcad.ts", "format": "usd-isaac", "output_path": "out/robot.usda",
  "options": { "format": "usd-isaac", "drives": { "shoulder": { "stiffness": 1000, "damping": 50 } } } } }
```

What the stage contains, and where each value comes from:

- `/<robot>` — `PhysicsArticulationRootAPI`. Links under `/<robot>/Links`, joints under `/<robot>/Joints`, materials under `/<robot>/Materials`.
- **Rigid bodies** (`PhysicsRigidBodyAPI` + `PhysicsMassAPI`), each placed at its mate-solved world pose (`xformOp:translate` / `xformOp:orient`) so links never spawn stacked. `physics:mass`, `physics:centerOfMass`, and inertia as `physics:diagonalInertia` (principal moments) + `physics:principalAxes` (the principal frame) — the same mass-properties and density rules as URDF, run through the MJCF exporter's positive-definite regularization, so a thin-plate link cannot produce a tensor the solver rejects.
- **Joints** — `PhysicsFixedJoint` / `PhysicsRevoluteJoint` / `PhysicsPrismaticJoint` with `physics:body0` / `physics:body1`, joint frames on BOTH bodies (`localPos0/1`, `localRot0/1`, derived from the solved poses so both sides name the same world frame at rest), `physics:axis` as a token (`"X"` / `"Y"` / `"Z"`; an off-axis connector becomes `"X"` plus a frame rotation), and limits — **degrees** for revolute, **metres** for prismatic.
- **Drives** — emitted ONLY when declared in `options.drives`, keyed by mate name: `{ stiffness, damping, maxForce?, targetPosition? }`, applied as `PhysicsDriveAPI:angular` (revolute) or `PhysicsDriveAPI:linear` (prismatic). Mates declare kinematics, not actuator gains, so the exporter never invents a drive — a zero-gain drive would silently hold a joint at its target. A drive keyed by a name that is not a revolute/prismatic mate fails with `cli.invalid-args`, listing the drivable joints.
- **Geometry** — a `visual` and a `collision` Mesh per link, both referencing the link's `.usda` mesh layer (points in metres, body frame). Collision carries `PhysicsMeshCollisionAPI` with `physics:approximation` from `options.collisionApproximation`: `convexHull` (default, fast) or `convexDecomposition` (keeps concave links such as forks and clevises honest).
- **Materials** — a `UsdPreviewSurface` per link from the part's own appearance: `.finish()`, `.material()`, `.color()`, or the default finish seeded by `arm.part(..., { material })`. A part with no appearance gets no binding rather than an invented grey.

Fail-closed gates:

- `export.usd.joint-unsupported` — a `planar`, `cylindrical`, `pin_slot`, or `ball` mate has no UsdPhysics joint that keeps its DOF count. Nothing is written. Restructure the mates, or export `format: 'sdf-gazebo'`, which carries the full mate vocabulary.
- `export.usd.mass-missing` — a link's mass came back non-finite or non-positive. Nothing is written. Declare a density or material on the part and check it is a closed solid.
- `export.usd.pose-unsolved` (warning) — the mate graph did not solve, so links were placed at the stage origin. Run `solve_mates`, fix the connector geometry, re-export.
