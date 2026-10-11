# SO-ARM-100 STEP files

These STEP files are bundled directly from
[`TheRobotStudio/SO-ARM100`](https://github.com/TheRobotStudio/SO-ARM100)
under that project's Apache-2.0 license. No edits — same bytes as upstream
at the time of bundling. Compatible with kernelCAD's MIT license under
Apache-2.0's redistribution terms.

| File | Source path (upstream `STEP/SO100/`) | Use |
|------|---------------------------------------|-----|
| `SO100_Assembly.step` | `Follower_Specific/SO_5DOF_ARM100_Assembly.step` | Pre-assembled 5-DOF arm + gripper, one solid. |
| `STS3215.step` | `STS3215_03a.step` | Single Feetech STS3215 serial-bus servo body. |
| `Moving_Jaw.step` | `Follower_Specific/Moving_Jaw_08d v1.step` | The actuated gripper jaw. |
| `Passive_Horn.step` | `Passive_Horn_01.step` | Round servo output disc. |

## Simulation meshes

`sim/` holds `so100.urdf` and the Apache-2.0 visual STLs from
`TheRobotStudio/SO-ARM100` `Simulation/SO100/` (`so100.urdf` and
`assets/`), same bytes as upstream `main` at commit `a758567c`. The meshes
are in the URDF link frame, in metres. `so100-arm.kcad.ts` scales them to
millimetres, places each one where the URDF puts it with every joint at
zero, and drives the six joints, which the single assembly STEP cannot do.

The URDF gives the motor visuals no `origin`: each `*_Motor.stl` is an
STS3215 already seated in its link frame, with the output spline on the
axis of the joint it drives. The script loads them as they are, so a motor
needs no placement of its own. They are closed meshes of about 3,000
triangles each. `STS3215.step` is not used for the arm: one copy
tessellates to about 134,000 triangles.

One process can build the arm once. A second build in the same process
runs the geometry heap out, which is why the two arm tests are separate
files.

| File | Link | Part in `so100-arm.kcad.ts` |
|------|------|------|
| `Base.stl` | base | `base` |
| `Base_Motor.stl` | base | `base-servo` (shoulder pan) |
| `Rotation_Pitch.stl` | shoulder | `shoulder` |
| `Rotation_Pitch_Motor.stl` | shoulder | `shoulder-servo` (shoulder lift) |
| `Upper_Arm.stl` | upper arm | `upper-arm` |
| `Upper_Arm_Motor.stl` | upper arm | `upper-servo` (elbow) |
| `Lower_Arm.stl` | lower arm | `lower-arm` |
| `Lower_Arm_Motor.stl` | lower arm | `lower-servo` (wrist pitch) |
| `Wrist_Pitch_Roll.stl` | wrist | `wrist` |
| `Wrist_Pitch_Roll_Motor.stl` | wrist | `wrist-servo` (wrist roll) |
| `Fixed_Jaw.stl` | gripper | `hand` |
| `Fixed_Jaw_Motor.stl` | gripper | `hand-servo` (jaw) |
| `Moving_Jaw.stl` | jaw | `jaw` |

## Updating

These files are pinned to a specific upstream commit. To refresh, re-fetch
each file from the same path on `main` and replace in place — the kcad
scripts pull them via `lib.fromSTEP(path)` so no other code needs changes.

## Why bundle vs. fetch on demand

Bundling guarantees the example is reproducible offline + version-stable.
Future kernelCAD versions may add a `lib.fromUrl(...)` for ad-hoc fetches
of vendor catalogs (McMaster-Carr, Misumi). Bundled files cover the hero
demo without touching the network.
