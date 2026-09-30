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

`sim/` holds the Apache-2.0 visual STLs from
`TheRobotStudio/SO-ARM100` `Simulation/SO100/assets/`. They are in the
URDF link frame, in metres. `so100-arm.kcad.ts` scales them to millimetres
and drives the six joints, which the single assembly STEP cannot do.
The black servo bodies in that script are plain boxes. The upstream motor
shells are open meshes, and loading them on top of the link shells exhausts
the geometry heap.

| File | Link |
|------|------|
| `Base.stl` | base |
| `Rotation_Pitch.stl` | shoulder |
| `Upper_Arm.stl` | upper arm |
| `Lower_Arm.stl` | lower arm |
| `Wrist_Pitch_Roll.stl` | wrist |
| `Fixed_Jaw.stl` | gripper |
| `Moving_Jaw.stl` | jaw |

## Updating

These files are pinned to a specific upstream commit. To refresh, re-fetch
each file from the same path on `main` and replace in place — the kcad
scripts pull them via `lib.fromSTEP(path)` so no other code needs changes.

## Why bundle vs. fetch on demand

Bundling guarantees the example is reproducible offline + version-stable.
Future kernelCAD versions may add a `lib.fromUrl(...)` for ad-hoc fetches
of vendor catalogs (McMaster-Carr, Misumi). Bundled files cover the hero
demo without touching the network.
