---
name: kernelcad-sdformat
description: Export multi-part assemblies to SDFormat — closed kinematic loops, native ball joints, per-link inertial/visual/collision. Use when the downstream consumer requires closed-loop support or a native spherical joint.
---

# kernelCAD — SDFormat export

SDFormat is an XML model description that, unlike URDF, accepts closed kinematic loops natively and exposes a native ball-joint type. kernelCAD's `export_model({ format: 'sdf-gazebo' })` writes a `.sdf` file.

## When to use over URDF

Pick SDFormat when:

- The assembly has a closed kinematic loop (4-bar linkages, parallel grippers, scissor mechanisms). URDF refuses these; SDFormat accepts.
- The assembly uses a ball mate. URDF must decompose into a 3-revolute chain; SDFormat emits one native `<joint type="ball">`.
- The downstream simulator accepts SDFormat directly.

Otherwise prefer URDF — wider tool ecosystem.

## Quickstart — 4-bar linkage

```typescript
const arm = assembly('4bar');
const a = arm.part('a', box(10, 10, 10), { density: 2700 });
const b = arm.part('b', box(10, 10, 10), { density: 2700 });
const c = arm.part('c', box(10, 10, 10), { density: 2700 });
const d = arm.part('d', box(10, 10, 10), { density: 2700 });
a.connector('abAxis', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
b.connector('abAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('ab', 'a.abAxis', 'b.abAxis', 'revolute', {});
b.connector('bcAxis', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
c.connector('bcAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('bc', 'b.bcAxis', 'c.bcAxis', 'revolute', {});
c.connector('cdAxis', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
d.connector('cdAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('cd', 'c.cdAxis', 'd.cdAxis', 'revolute', {});
d.connector('daAxis', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
a.connector('daAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('da', 'd.daAxis', 'a.daAxis', 'revolute', {});
return arm.model();
```

Export via MCP:

```json
{ "tool": "export_model", "input": { "file": "4bar.kcad.ts", "format": "sdf-gazebo", "output_path": "out/model.sdf" } }
```

Result: `out/model.sdf` with all 4 joints preserved — the closed loop is intact.

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

## Minimal-tier scope

This slice ships model + link + joint + inertial + visual + collision. Deferred to follow-up slices:

- `<sensor>` (cameras, IMUs, lidars)
- `<plugin>` (simulator-specific)
- `<world>` (world-level composition)
- `<actor>` (animated meshes)

## Verification gates

- `G-sdf-closed-loop-supported` — a closed mate graph exports cleanly (no `closed-loop` diagnostic).
- `G-sdf-native-ball` — a `ball` mate emits exactly one `<joint type="ball">` (no decomposition).

## Structural validation

Validation runs inside the emitter. Codes: `export.sdf-gazebo.invalid-version`, `export.sdf-gazebo.dangling-link-ref`, plus the lossy diagnostics above. There is no separate `validate_sdf` MCP tool — the emitter validates as it writes and raises before bytes leave memory.
