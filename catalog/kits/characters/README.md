# Characters kit

Mechanical low-poly characters built from rigid parts and joined by kernelCAD mates. Every revolute or prismatic mate becomes a pivot node in the exported GLB, and its type, local axis and range are listed in `asset.extras.kernelcad.rig`. That makes the characters ready to pose or animate in three.js, Godot or Unity without a skinned skeleton. Each asset is a parametric `.kcad.ts` program, modelled in millimetres with Z up and the feet or wheels on z = 0. It exports as a flat-shaded GLB in metres on one shared vertex-coloured palette material. Colour knobs become palette zones, and builds, sizes and part counts are choice knobs.

The kit is built from rigid parts: robots, a rover, an arm, a jointed artist's mannequin, blocky humanoids and toy-style low-poly animals whose limbs, heads and tails are separate pivoting pieces. Skinned meshes are out of scope, because a CAD kernel builds rigid bodies, not deforming skin.

| id | what it is | knobs | pivots | triangles (default) |
| --- | --- | --- | --- | --- |
| robot-humanoid | Boxy two-legged service robot | build, antenna, body, trim, visor, joint | neck, shoulders, elbows, hips, knees (9) | 400 |
| robot-dog | Four-legged robot dog | size, ears, body, panel, eyes, joint | neck, tail, 4 hips, 4 knees (10) | 336 |
| rover-robot | Wheeled scout robot with pan-tilt camera head | wheels (4/6), mast, body, trim, tyre, lens | wheel spins, pan, tilt (6–8) | 620 |
| robot-arm | Desktop articulated arm with sliding gripper | reach, body, accent, joint, gripper | yaw, shoulder, elbow, wrist, 2 finger slides (6) | 360 |
| mannequin | Life-size posable wooden mannequin | height, wood, joint | waist, neck, shoulders, elbows, wrists, hips, knees, ankles (14) | 548 |
| robot-cat | Sleek robot cat with pointed ears and a curling two-piece tail | size, tail, body, panel, eyes, joint | neck, tail sweep, tail curl, 4 hips, 4 knees (11) | 388 |
| robot-bird | Small robot bird with two-piece wings, beak and tail fan | size, crest, body, wing, beak, eyes | neck, shoulders, wrists, tail, hips (8) | 328 |
| spider-bot | Domed spider robot on six or eight two-link legs with a sensor turret | legs, size, shell, leg, joint, sensor | turret pan, sensor tilt, hips, knees (14–18) | 504 |
| crab-bot | Wide-shelled crab robot with snapping pincers, eye stalks and six legs | size, claws, shell, limb, eyes, belly | eye nod, shoulders, pincers, 6 leg hips (11) | 706 |
| wheeled-droid | Boxy service droid on two drive wheels with a flat sensor head, camera bar and folding antenna | height, arms, body, panel, dark, lens | wheel spins, caster, head pan, head tilt, antenna, shoulders, elbows (6–10) | 684 |
| blocky-villager | Chunky box-built villager NPC with hat, hair, shirt and boots | height, hair, hat, skin, hairColor, shirt, pants, boots, hatColor | neck, shoulders, elbows, hips, knees (9) | 380 |
| knight-figure | Armoured knight with great helm, plume, tabard, sword or spear and shield | weapon, shield, armour, trim, tabard, plume, leather | waist, neck, shoulders, elbows, hips, knees (10) | 880 |
| cow | Life-size dairy cow with spots, udder, horns and swishing tail | horns, spots, hide, spot, muzzle, hoof | neck, tail, 4 hips, 4 knees (10) | 476 |
| horse | Life-size horse with arched neck, mane, tail, blaze and optional saddle | saddle, blaze, coat, mane, hoof, saddleColor, blazeColor | neck, poll, tail, 4 hips, 4 knees (11) | 628 |
| penguin | Waddling penguin with white belly, opening beak, flippers and feet | size, crest, back, belly, beak, eye | neck, beak, tail, shoulders, ankles (7) | 408 |

Every link is authored in the standing pose, and each joint connector sits at the same point on both links, so pose 0 is the as-built pose. Rig ranges are relative to that pose.

## Licence

Every asset in this kit — the `.kcad.ts` source and any GLB or ES module exported from it — is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Use, modify and ship it in commercial games without attribution. The catalog metadata carries `license: "CC0-1.0"` per asset.

## Provenance

Geometry is original kernelCAD `.kcad.ts` source written for this catalog. No Polyfork downloads or meshes, no external meshes, textures or palettes, and no mesh decimation are involved.
