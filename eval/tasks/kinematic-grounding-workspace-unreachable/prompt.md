# Task: Workspace-Reachability Unreachable Demonstration (Slice 1)

Build an assembly that deliberately demonstrates the v0.7 Slice 1 workspace-
reachability gate (`assembly.workspace.unreachable`) firing on an
`arm.workspace(connectorRef, { reachable })` declaration whose target lies
outside the connector's sampled pose-envelope AABB.

Functional requirements:

- A 1-DOF revolute arm: two `box(...)` parts mated by a `revolute` mate with
  small `limitsDeg` (e.g. `[-10, 10]`) so the link's tracked tip connector
  can barely move from its zero-pose position.
- Declare a `frame` connector at the link's tip so its world pose is
  observable by the pose-envelope sampler.
- Call `arm.workspace('link.tip', { reachable: [...] })` with at least one
  world-frame target far outside the connector's reachable arc (e.g. on the
  opposite side of the arm).
- Call `arm.solvedModel({}, { validate: 'warn', posesGate: 'envelope' })` so
  the diagnostics flow to `scene.warnings` instead of throwing.
- Assert (via a thrown error if the assertion fails) that `scene.warnings`
  contains a diagnostic with code `'assembly.workspace.unreachable'`. Return
  the scene.

The script must evaluate cleanly: a clean evaluate means the gate fired as
intended. A non-clean evaluate (caused by the assertion throwing, or the
gate not firing at all) means the demonstration failed.

Z-up, millimetres.
