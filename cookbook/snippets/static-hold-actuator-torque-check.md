---
id: static-hold-actuator-torque-check
title: Check whether an actuator can hold a joint against gravity
tags: [assembly, connector, mate, revolute, hinge, joint, static-hold, actuator, torque, kinematic]
keywords:
  - will this servo hold the arm up
  - actuator torque check
  - static hold
  - gravitational holding torque
  - safety margin on a joint
  - does the motor stall under gravity
  - checkStaticHold
when_to_use: >-
  A revolute or prismatic joint drives a downstream mass against gravity
  (a robot arm shoulder, a lift stage) and you need to know whether the
  declared actuator torque/force is sufficient — not just whether the
  mechanism is collision-free. Declare actuator: { torqueNm } (revolute) or
  actuator: { forceN } (prismatic) on the joint, then call
  kinematic.checkStaticHold(arm, opts). Real mass properties come from the
  part's geometry + declared density/material; the worst pose across the
  joint's declared range is reported alongside the margin. Fires
  assembly.joint.static-hold.exceeded when the actuator is undersized,
  assembly.joint.static-hold.margin-low when it clears but under the
  requested safety margin.
---

```typescript
const arm = assembly('shoulder-hold-check');

const base = arm.part('base', box(40, 40, 40, true));
const link = arm.part(
  'link',
  box(200, 20, 10, true).translate(100, 0, 0),
  { material: 'steel' },
);

arm.revolute('shoulder', base, link, {
  axis: [0, 1, 0],
  origin: [0, 0, 0],
  limitsDeg: [-90, 90],
  actuator: { torqueNm: 1.5 },
});

const hold = await kinematic.checkStaticHold(arm, { minTorqueMarginPct: 20 });
// hold.joints[0] => { jointName: 'shoulder', kind: 'revolute',
//   actuatorCapacity: 1.5, worstRequired: <N*m>, marginPct, worstPose }

return arm.solvedModel({ shoulder: 0 }, { ignore: [['base', 'link']] });
```
