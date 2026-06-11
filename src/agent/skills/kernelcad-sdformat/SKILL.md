---
name: kernelcad-sdformat
description: Export multi-part assemblies to SDFormat — closed kinematic loops, native ball joints, solved per-link poses, per-link inertial/visual/collision with mesh files. Use when the downstream simulator ingests SDFormat directly or the assembly needs closed-loop / native-spherical-joint support.
---

# kernelCAD — SDFormat export

SDFormat is an XML model description that, unlike URDF, accepts closed kinematic loops natively and exposes a native ball-joint type. kernelCAD's `export_model({ format: 'sdf-gazebo' })` writes a `.sdf` (spec version 1.10 — parsed by current simulator LTS releases) plus a sibling `meshes/` directory with one STL per link. Ship the whole directory: the SDF references `meshes/<part>.stl` by relative URI, resolved against the `.sdf` file location, so the export loads in `gz sim` with no resource-path environment setup.

## When to use over URDF

Pick SDFormat when:

- The assembly has a closed kinematic loop (4-bar linkages, parallel grippers, scissor mechanisms). URDF refuses these; SDFormat accepts.
- The assembly uses a ball mate. URDF must decompose into a 3-revolute chain; SDFormat emits one native `<joint type="ball">`.
- The downstream simulator accepts SDFormat directly.

Otherwise prefer URDF — wider tool ecosystem.

## What the emitter writes (verified against gz-sim)

- **Per-link `<pose>` from the solved mate graph.** The exporter runs the mate solver at the default pose and stamps each link's world transform, so links spawn assembled instead of stacked at the model origin. If the mate graph cannot be solved, the export still succeeds but emits `export.sdf-gazebo.pose-unsolved` (warn) and identity poses — fix the geometry before shipping to a simulator.
- **Joint `<pose>` relative to the CHILD link frame** (the SDFormat convention), i.e. the child-side connector origin; `<axis><xyz>` is the child-side connector axis expressed in the joint frame.
- **Mesh `<scale>0.001 0.001 0.001</scale>`** on every visual/collision: link STLs are kernelCAD-native mm, SDFormat consumes metres, and the scale keeps geometry consistent with the (already-SI) inertials and joint poses.
- **Companion mesh files**: `meshes/<part>.stl` written next to `output_path` by the MCP tool and the CLI; the written paths are reported in `mesh_files`.
- **World anchor**: `arm.virtualJoint(name, { type: 'fixed', parentFrame: 'world', childLink })` lowers to a native `<joint type="fixed"><parent>world</parent>...` so the model spawns welded instead of free-falling.

## Quickstart — 4-bar linkage

Author closed loops so the loop closes exactly at pose 0 — the solver verifies the loop-closure residual and refuses to stamp poses otherwise. A parallelogram linkage (ground pivots 50 apart, crank/rocker pivots 25 apart, coupler pivots 50 apart) closes by construction:

```typescript
const arm = assembly('fourbar');
const ground = arm.part('ground', box(60, 10, 10), { density: 2700 });
const crank = arm.part('crank', box(10, 10, 35), { density: 2700 });
const coupler = arm.part('coupler', box(60, 10, 10), { density: 2700 });
const rocker = arm.part('rocker', box(10, 10, 35), { density: 2700 });
ground.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
crank.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
crank.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
coupler.connector('crankPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
coupler.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
rocker.connector('couplerPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 30] }, axis: [0, 1, 0] });
rocker.connector('groundPivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 5] }, axis: [0, 1, 0] });
ground.connector('rockerPivot', { type: 'axis', origin: { kind: 'vec3', value: [55, 5, 5] }, axis: [0, 1, 0] });
arm.mate('crank_ground', 'ground.crankPivot', 'crank.groundPivot', 'revolute', {});
arm.mate('crank_coupler', 'crank.couplerPivot', 'coupler.crankPivot', 'revolute', {});
arm.mate('coupler_rocker', 'coupler.rockerPivot', 'rocker.couplerPivot', 'revolute', {});
arm.mate('rocker_ground', 'rocker.groundPivot', 'ground.rockerPivot', 'revolute', {});
arm.virtualJoint('world_weld', { type: 'fixed', parentFrame: 'world', childLink: 'ground' });
return arm.model();
```

Export via MCP:

```json
{ "tool": "export_model", "input": { "file": "4bar.kcad.ts", "format": "sdf-gazebo", "output_path": "out/model.sdf" } }
```

Result: `out/model.sdf` with all 4 joints preserved and solved link poses, plus `out/meshes/{ground,crank,coupler,rocker}.stl`.

## Mate-to-joint mapping (differences from URDF)

| kernelCAD mate | SDFormat joint | Notes |
|---|---|---|
| `fastened` | `fixed` | Direct. |
| `revolute` | `revolute` | Limits in radians inside `<axis><limit>`. |
| `prismatic` | `prismatic` | Limits in metres inside `<axis><limit>`. |
| `planar` | `planar` | Native. |
| `ball` | `ball` | **Native — no decomposition (URDF differentiator).** |
| `cylindrical` | `revolute` (lossy) | SDFormat also lacks cylindrical; `export.sdf-gazebo.cylindrical-lossy`. |
| `pin_slot` | `revolute` (lossy) | Same; `export.sdf-gazebo.pin-slot-lossy`. |

## Simulator consumer notes (verified 2026-06 against gz-sim Harmonic + Ionic, headless)

- Serial chains and ball joints simulate correctly out of the box: links spawn at solved poses, joints articulate under `JointController` / `JointPositionController` plugins, ball mates swing under gravity.
- **Closed loops parse but do not yet simulate as loops.** `gz sdf --check` accepts the export, but the default physics engine (dartsim wrapper) logs `Asked to create a closed kinematic chain ... not supported` and simulates the spanning tree (loop-closure joint dropped); the bullet-featherstone engine refuses the model outright (`multiple parent joints`). This is a simulator-side limitation, not an export defect — the loop joint is present and spec-valid in the file.
- kernelCAD parts are typically gram-scale; force-based PID joint controllers with default gains produce NaN explosions (the simulator aborts with a transform assertion). Use velocity-mode position controllers (`<use_velocity_commands>true</use_velocity_commands>`) or match gains to the link inertias.

## Minimal-tier scope

This slice ships model + link + joint + inertial + visual + collision + world-anchor fixed joints. Deferred to follow-up slices:

- `<sensor>` (cameras, IMUs, lidars)
- `<plugin>` (simulator-specific)
- `<world>` (world-level composition)
- `<actor>` (animated meshes)

## Verification gates

- `G-sdf-closed-loop-supported` — a closed mate graph exports cleanly (no `closed-loop` diagnostic).
- `G-sdf-native-ball` — a `ball` mate emits exactly one `<joint type="ball">` (no decomposition).
- `G-sdf-links-posed` — a mate graph that solves at the default pose emits non-identity per-link `<pose>` elements (no `pose-unsolved` diagnostic).

## Structural validation

Validation runs inside the emitter. Codes: `export.sdf-gazebo.invalid-version`, `export.sdf-gazebo.dangling-link-ref`, `export.sdf-gazebo.pose-unsolved` (warn — links emitted at the model origin), plus the lossy diagnostics above. There is no separate `validate_sdf` MCP tool — the emitter validates as it writes and raises before bytes leave memory.
