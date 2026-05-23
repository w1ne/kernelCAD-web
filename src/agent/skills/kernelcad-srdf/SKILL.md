---
name: kernelcad-srdf
description: Add planning-group, end-effector, virtual-joint, and allowed-collision metadata on top of an assembly. Use after kernelcad-urdf when the downstream consumer needs motion-planner semantics layered on the URDF.
---

# kernelCAD — SRDF export

SRDF layers planning-group and motion-planner semantics on top of a URDF: which joints form an arm, which links form a gripper, which link pairs are safe to ignore for collision-checking, and named pose snapshots. kernelCAD's `export_model({ format: 'srdf' })` writes the `.srdf` file; the allowed-collision matrix is auto-derived from the existing mate graph.

## When to use

- The assembly has at least one planning group declared via `arm.planningGroup(...)`.
- The downstream consumer needs motion-planner semantics (planning groups, end-effectors, named pose states, allowed-collision matrix).

Always pair with `kernelcad-urdf`: SRDF is a layer over URDF, not a standalone description.

## Capture-time API

Five capture-time methods on the `arm.*` namespace. Each is declarative — the methods record intent; `export_model` materialises the SRDF later.

```typescript
arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'tool_tip' } });
arm.planningGroup('gripper', { joints: ['gripper-open'] });
arm.endEffector('tool', { parentLink: 'tool_tip', group: 'gripper', parentGroup: 'main' });
arm.virtualJoint('world_joint', { type: 'fixed', parentFrame: 'world', childLink: 'base' });
arm.groupState('home', 'main', { 'shoulder-pitch': 0, 'elbow-pitch': 0 });
arm.disableCollision('linkA', 'linkB', { reason: 'User' });
```

## Allowed-collision matrix (ACM)

Auto-derived from the existing kernelCAD data. Four reasons:

- **Adjacent** — link pair shares a joint or mate; never collides during motion.
- **Never** — link pair never overlaps across pose-envelope samples (default 4 samples per limited mate; full sampling pass lands in a follow-up slice — today the deriver returns Adjacent + User only).
- **Default** — link pair interferes at the default pose (broken model; disable to avoid spurious plan blocks).
- **User** — explicit `arm.disableCollision(linkA, linkB, { reason: 'User' })` override.

Sampling configuration:

```typescript
// MCP: pass options on export_model.
export_model({ format: 'srdf', file: 'arm.kcad.ts', output_path: 'out/robot.srdf',
               options: { samplesPerMate: 4, combinatorial: true } });
```

Sparse sampling (`samplesPerMate < 4`) emits `export.srdf.acm-sparse-sampling` as a warning.

## Verification gates

- `G-srdf-planning-group-defined` — at least one `arm.planningGroup(...)` declared. The export refuses with `export.srdf.planning-group-missing` otherwise.
- `G-srdf-acm-coverage` — auto-derived `<disable_collisions>` covers every link pair connected by a joint or mate (Adjacent), plus any explicit User overrides.

Boundary: URDF owns the physical structure (links, joints, inertials). SRDF owns planning-group and motion-planner semantics layered on top.
