# v0.5 — synchronized live-build demo

## Hero artifact

robot-arm-3axis-parametric

## Why memorable

- Recognizable in one second: a desktop hobby robot arm with named, colored parts (servos, beams, plates, end-effector) — reads as a real machine, not abstract geometry.
- New tool central: `arm.solvedModel(poses)` now returns a multi-body `Scene` instead of a boolean union, so per-part identity (color, name, transform) survives all the way to the renderer and STEP export — no fusion until you ask for it.
- Reads at 360°: per-part FK-posed transforms expose the body-tree articulation; the 8-second rotation phase shows three driven joints (base-yaw, shoulder-pitch, elbow-pitch) plus the decorative attachments riding along.

## What's new

This release ships the **assembly scene-graph slice**: `Assembly.solvedModel(poses)` and `Assembly.model()` return a frozen ordered `Scene` of `ScenePart` records — each with a name, world transform, role color, and optional metadata. Boolean fusion is now an opt-in `scene.toCompound()` (lossless OCCT group, default for STEP) or `scene.toUnion()` (explicit fuse, antipattern). The robot-arm hero authors 13 parts in their own local frames and lets the body-tree FK walk plant children where the joints land — no hand-rolled `.rotate(axis, deg, pivot)` chains.

This release also closes the agent feedback gap with two new CLI commands:

- `kernelcad render <file.kcad.ts>` emits a multi-view headless PNG (front / right / top / iso) — 2×2 composite by default, `--separate` for four files. ~6 seconds vs the ~5-minute hero capture pipeline.
- `kernelcad interference <file.kcad.ts>` runs pairwise BREP clash detection over the resolved Scene (industry-standard, same primitive Fusion / Onshape / SolidWorks ship). Exit 1 on any pair with intersection volume above the epsilon. The robot-arm hero was iterated against this tool: total clash volume dropped from ~78 K mm³ on the first draft to ~10 K mm³ in the shipped version (87% reduction), with the remaining clashes all small joint contact (yoke embracing a beam, shaft passing through a bore).

Together these close the agent-first authoring loop: write → render → check interference → adjust → repeat.

![Demo](./demo.mp4)
![Panel](./panel.png)
