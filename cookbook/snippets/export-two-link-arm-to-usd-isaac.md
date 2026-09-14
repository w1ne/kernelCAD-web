---
id: export-two-link-arm-to-usd-isaac
title: Export a mated assembly to a USD Isaac physics stage
tags: [assembly, mate, revolute, export]
keywords:
  - export to usd
  - usd-isaac format
  - isaac sim
  - isaac lab
  - articulation root
  - PhysicsRevoluteJoint
  - physics simulation stage
  - robot description for isaac
when_to_use: >-
  The consumer is a GPU physics / robot-learning stack that imports a
  UsdPhysics stage directly instead of parsing URDF or SDF. Author parts with a
  named material (it seeds both mass and appearance), axis connectors, and
  fastened / revolute / prismatic mates exactly as for urdf, then call
  export({ target: 'model', format: 'usd-isaac', output_path: 'robot.usda' }).
  You get an articulation root, one rigid body per link at its solved pose with
  mass and principal inertia, one PhysicsRevoluteJoint / PhysicsPrismaticJoint /
  PhysicsFixedJoint per mate with limits, UsdPreviewSurface materials, and a
  meshes/<link>.usda layer per link. Declare actuator gains with
  options.drives { <mate>: { stiffness, damping } } — none are invented. Planar,
  cylindrical, pin_slot and ball mates fail closed with
  export.usd.joint-unsupported.
---

```typescript
const arm = assembly('two-link-usd-arm');

const base = arm.part('base', box(40, 40, 20, true).translate(0, 0, 10), { material: 'steel' });
const link1 = arm.part('link1', box(20, 20, 100, true).translate(0, 0, 50), { material: 'aluminum' });

base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 20] }, axis: [0, 0, 1] });
link1.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });

return arm.model();
```
