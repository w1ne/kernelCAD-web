# v0.5 — synchronized live-build demo

## Hero artifact

robot-arm-3axis-parametric

## Why memorable

- Recognizable in one second: a desktop hobby robot arm with named, colored parts (servos, beams, plates, end-effector) — reads as a real machine, not abstract geometry.
- New tool central: `arm.solvedModel(poses)` now returns a multi-body `Scene` instead of a boolean union, so per-part identity (color, name, transform) survives all the way to the renderer and STEP export — no fusion until you ask for it.
- Reads at 360°: per-part FK-posed transforms expose the body-tree articulation; the 8-second rotation phase shows three driven joints (base-yaw, shoulder-pitch, elbow-pitch) plus 11 fixed decorative attachments riding along.

## What's new

This release ships the **assembly scene-graph slice**: `Assembly.solvedModel(poses)` and `Assembly.model()` return a frozen ordered `Scene` of `ScenePart` records — each with a name, world transform, role color, and optional metadata. Boolean fusion is now an opt-in `scene.toCompound()` (lossless OCCT group, default for STEP) or `scene.toUnion()` (explicit fuse, antipattern). The robot-arm hero authors 14 parts in their own local frames and lets the body-tree FK walk plant children where the joints land — no hand-rolled `.rotate(axis, deg, pivot)` chains.

This release also closes the agent feedback gap with `kernelcad render <file>`, a multi-view headless PNG command (front / right / top / iso, 2×2 composite by default, ~6s round-trip). For the first time, an agent authoring a `.kcad.ts` script can see what it built without running a 5-minute capture pipeline.

![Demo](./demo.mp4)
![Panel](./panel.png)
