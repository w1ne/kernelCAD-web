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
  The downstream workflow is a physics-simulation / robot-learning stack that
  consumes USD directly (UsdPhysics schema) rather than parsing URDF/SDF at
  import time. Declare the assembly's parts, connectors, and mates exactly as
  for urdf/sdf-gazebo export, then call export({ target: 'model', format:
  'usd-isaac' }) — it writes an ASCII USD stage with a PhysicsArticulationRootAPI
  root, one rigid-body prim per link (mass/inertia/COM), and one
  PhysicsFixedJoint/PhysicsRevoluteJoint/PhysicsPrismaticJoint per mate, plus a
  sibling meshes/<part>.stl per link. Mate kinds with no UsdPhysics joint
  equivalent (planar/cylindrical/pin_slot/ball) fail closed with
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
