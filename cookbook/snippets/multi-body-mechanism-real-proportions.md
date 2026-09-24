---
id: multi-body-mechanism-real-proportions
title: Open-chain multi-body mechanism with real machine-element proportions
tags: [assembly, connector, mate, revolute, joint, kinematic, plate, parameter]
keywords:
  - robot arm
  - cobot arm
  - open-chain mechanism
  - multi-body mechanism
  - real proportions
  - machine elements not sticks
  - bearing towers
  - yaw turret
  - supported joints
  - production robot arm
  - complex assembly ChatGPT
when_to_use: >-
  Prompt asks for a real / complex robot arm, cobot, open-chain mechanism, or
  multi-body machine with joints. Bodies must read as plates, towers, yokes —
  not stick figures. Reuse supported-arm lessons: connectors + revolute mates
  with limits, no floating joints. Prefer design_loop until review is green.
---

Adam-level multi-body bar: recognizable machine elements, correct joints,
mesh+anim paint in ChatGPT. Do **not** publish stick-link skeletons when the
user asked for a real arm / mechanism.

```typescript
const shoulderDeg = param('shoulderDeg', 25, { min: -20, max: 70 });

const arm = assembly('supported-shoulder');

// Base: thick desk plate + two bearing towers (machine element, not a stick).
const base = arm.part(
  'base-frame',
  box(120, 100, 8, true)
    .translate(0, 0, 4)
    .union(box(20, 14, 52, true).translate(0, 40, 34))
    .union(box(20, 14, 52, true).translate(0, -40, 34)),
);
base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 56] },
  axis: [0, 1, 0],
});

// Upper link: beam + yoke cheeks + hinge pin that stick out past the towers.
const upperLen = 110;
const pin = cylinder(100, 4).rotate([1, 0, 0], 90).translate(0, 50, 0);
const upper = arm.part(
  'upper-link',
  box(upperLen - 24, 14, 12, true)
    .translate(upperLen / 2, 0, 0)
    .union(box(22, 8, 28, true).translate(0, 14, 0))
    .union(box(22, 8, 28, true).translate(0, -14, 0))
    .union(pin)
    .union(box(14, 8, 22, true).translate(upperLen, 14, 0))
    .union(box(14, 8, 22, true).translate(upperLen, -14, 0)),
);
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});

arm.mate('shoulder-pitch', 'base-frame.shoulder', 'upper-link.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 70],
});

// Pin/tower contact is intentional hinge bearing — declare it.
return arm.solvedModel({}, { ignore: [['base-frame', 'upper-link']] });
```

**Loop until green (do not bypass)**

1. `evaluate_script` — fix `mechanism.orphan-part` / disconnected components first.
2. `design_loop({ goal, attempts, includeInterference: true })` — attach
   `visualReview` after screenshots; revise source from `nextActionPrompt`.
3. Stop when `ok: true`, or when `convergence.escalate` (same failure signature
   twice — change strategy, do not nudge).
4. `open_in_studio` for mesh (+ `animationView` when you want ChatGPT Play).

See also `examples/robot-arm/skill-built-supported-arm.kcad.ts` and
`docs/agent/adam-quality-bar.md`.
