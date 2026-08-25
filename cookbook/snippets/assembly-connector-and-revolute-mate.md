---
id: assembly-connector-and-revolute-mate
title: Declare a connector and join parts with a revolute mate
tags: [assembly, connector, mate, revolute, hinge, joint]
keywords:
  - assembly with parts connectors and mates
  - how do I declare a connector
  - revolute joint
  - hinge
  - axis connector origin
  - pivot joint between parts
  - declare connector and mate
when_to_use: >-
  The model has multiple mechanical parts (not a single fused body) that
  need a named pivot between them. Declare an axis connector on each part
  with partRef.connector(name, { type: 'axis', origin: { kind: 'vec3', value:
  [...] }, axis: [...] }), then join the connectors with arm.mate(name,
  'partA.conn', 'partB.conn', 'revolute', { limitsDeg: [min, max] }). This is
  the canonical assembly-topology vocabulary for hinges, elbows, and any
  revolute joint — connector origins must use the tagged
  { kind: 'vec3', value: [...] } form, not a bare [x, y, z] array.
---

```typescript
const arm = assembly('two-link-arm');

const base = arm.part('base', box(40, 40, 16));
const link = arm.part('arm', box(10, 40, 6).translate(0, 20, 0));

base.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [5, 20, 16] }, axis: [0, 1, 0] });
link.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });

arm.mate('elbow', 'base.pivot', 'arm.pivot', 'revolute', { limitsDeg: [0, 90] });

return arm.solvedModel({ elbow: 45 });
```
