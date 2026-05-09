# Task: Desktop 3-Axis Robot Arm

Build a parametric desktop 3-axis robot arm with three revolute joints:
1. Base yaw (rotates around vertical Z)
2. Shoulder pitch (rotates around a horizontal axis)
3. Elbow pitch (rotates around a horizontal axis)

Make it look like an actual hobby robot arm — visible servos at each joint, output shafts, mounting plates, the mechanical density a 3D-printed kit would have. Not a chain of plain cylinders.

Apply role colors so parts read at a glance (e.g. `Shape.color('servo')`, `'beam'`, `'shaft'`, `'plate'`).

Declare each link as a part on `assembly()` and the rotational joints with `assembly.revolute(...)`. Return `assembly.model()`.

Use kernelCAD's primitives, boolean operations, and assembly API. Z-up, millimetres, degrees.
