# Characters kit

Mechanical low-poly characters built from rigid parts and joined by kernelCAD mates. Every revolute or prismatic mate becomes a pivot node in the exported GLB, and its type, local axis and range are listed in `asset.extras.kernelcad.rig`. That makes the characters ready to pose or animate in three.js, Godot or Unity without a skinned skeleton. Each asset is a parametric `.kcad.ts` program, modelled in millimetres with Z up and the feet or wheels on z = 0. It exports as a flat-shaded GLB in metres on one shared vertex-coloured palette material. Colour knobs become palette zones, and builds, sizes and part counts are choice knobs.

The kit is deliberately mechanical: robots, a rover, an arm and a jointed artist's mannequin. Organic creatures and skinned meshes are out of scope, because a CAD kernel builds rigid bodies, not deforming skin.

| id | what it is | knobs | pivots | triangles (default) |
| --- | --- | --- | --- | --- |
| robot-humanoid | Boxy two-legged service robot | build, antenna, body, trim, visor, joint | neck, shoulders, elbows, hips, knees (9) | 400 |
| robot-dog | Four-legged robot dog | size, ears, body, panel, eyes, joint | neck, tail, 4 hips, 4 knees (10) | 336 |
| rover-robot | Wheeled scout robot with pan-tilt camera head | wheels (4/6), mast, body, trim, tyre, lens | wheel spins, pan, tilt (6–8) | 620 |
| robot-arm | Desktop articulated arm with sliding gripper | reach, body, accent, joint, gripper | yaw, shoulder, elbow, wrist, 2 finger slides (6) | 360 |
| mannequin | Life-size posable wooden mannequin | height, wood, joint | waist, neck, shoulders, elbows, wrists, hips, knees, ankles (14) | 548 |

Every link is authored in the standing pose, and each joint connector sits at the same point on both links, so pose 0 is the as-built pose. Rig ranges are relative to that pose.

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
