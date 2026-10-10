---
id: so-arm100
title: SO-ARM100 follower arm — vendor link meshes, STEP jaw, passive horn
tags: [assembly, connector, mate, revolute, joint, kinematic, parameter, actuator]
keywords:
  - SO-ARM100
  - SO-100 robot arm
  - LeRobot follower arm
  - so100 gripper jaw
  - real robot arm yellow links black servos
  - Moving_Jaw passive horn pincer
  - six axis pan lift elbow wrist roll jaw
  - execute_cookbook so-arm100
example: examples/robot-arm/so100/so100-arm.kcad.ts
when_to_use: >-
  The prompt asks for the real SO-ARM100 / SO-100 follower arm, the
  kernelcad.com hero arm, or a gripper with the vendor moving jaw — not a
  tube-and-clevis sketch. execute_cookbook({ id: 'so-arm100' }) evaluates
  examples/robot-arm/so100/so100-arm.kcad.ts (Apache-2.0 link STLs, the
  Moving_Jaw STEP solid, and the passive horn on the wrist). One-liner:
  kernelcad evaluate examples/robot-arm/so100/so100-arm.kcad.ts. Do not
  redraw it as floating cylinders or the primitive 4-DOF cookbook arm.
---

```typescript
// Not a self-contained snippet. Vendor meshes live next to the example.
// execute_cookbook({ id: 'so-arm100' }) evaluates this file:
//   examples/robot-arm/so100/so100-arm.kcad.ts
// CLI: kernelcad evaluate examples/robot-arm/so100/so100-arm.kcad.ts
//
// Jaw: parts/Moving_Jaw.step (solid, millimetres, same frame as the sim
// STL) baked by the gripper rpy and then the wrist-roll rpy, so the finger
// closes on the fixed jaw. parts/Passive_Horn.step is fastened to the jaw
// mount face (bolt circle at local z = -24). jawDeg -11 is the closed stop.
```
