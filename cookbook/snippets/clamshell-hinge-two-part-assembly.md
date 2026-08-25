---
id: clamshell-hinge-two-part-assembly
title: Clamshell hinge between a base and a lid, joined by a revolute mate
tags: [assembly, connector, mate, revolute, hinge, joint]
keywords:
  - hinge
  - revolute joint
  - clamshell hinge
  - lid pivots on base
  - assembly with connectors and mates
  - declare a connector
  - hingeAxis connector
when_to_use: >-
  You are modeling a laptop-lid-style clamshell hinge, or any assembly
  where one rigid body swings about a fixed pivot line on another rigid
  body. Declare a matching axis connector on both bodies along the
  physical hinge line, then join them with a revolute mate and limitsDeg
  to bound the swing angle. Relevant for hinge, revolute joint, or
  assembly with connectors and mates.
---

```typescript
const arm = assembly('clamshell-hinge');

const base = arm.part('base', box(300, 200, 12).translate(0, 0, 6));
const lid = arm.part('lid', box(300, 200, 6).translate(0, 100, 3));

base.connector('hingeAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, -100, 12] }, axis: [1, 0, 0] });
lid.connector('hingeAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });

arm.mate('hinge', 'base.hingeAxis', 'lid.hingeAxis', 'revolute', { limitsDeg: [-15, 135] });

return arm.solvedModel({ hinge: 90 });
```
