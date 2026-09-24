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
  with limits, jointSupport / mechanicalJoint intent, grounded base-frame, and
  a tendon or mechanicalJoint so gravity-hold passes. Prefer design_loop until
  review is green.
---

Adam-level multi-body bar: recognizable machine elements, correct joints,
mesh+anim paint in ChatGPT. Do **not** publish stick-link skeletons when the
user asked for a real arm / mechanism.

Gates that fail without the intents below:
- `assembly.joint-topology.unsupported-axis` → `arm.jointSupport` / `arm.mechanicalJoint`
- `assembly.connectivity.floating-moving-part` → root named `base-frame` / `base` / `ground`, or `physicalUseCase(...).stableParts`
- `mechanism.drops-on-release` → `arm.tendon(...)` across the hinge, or `arm.mechanicalJoint(...)` (actively driven)

```typescript
const shoulderDeg = param('shoulderDeg', 25, { min: -20, max: 70 });

const arm = assembly('supported-shoulder');

// Base: thick desk plate + two cylindrical bearing towers (machine element).
const base = arm.part(
  'base-frame',
  box(120, 100, 8, true)
    .translate(0, 0, 4)
    // BREP cylinder(h,r) sits on z=0..h — start at z=0 so towers fuse into the plate.
    .union(cylinder(56, 10).translate(0, 40, 0))
    .union(cylinder(56, 10).translate(0, -40, 0)),
);
base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 56] },
  axis: [0, 1, 0],
});
base.connector('servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-40, 0, 8] },
});

// Seated shoulder servo — fastened to the base so the joint is actively driven.
// Park the servo on the rear of the desk plate — clear of the hinge pin/cheeks.
const servo = arm.part(
  'shoulder-servo',
  box(34, 28, 22, true).translate(-40, 0, 19).color('actuator'),
);
servo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-40, 0, 8] },
});

// Upper link: beam + yoke cheeks + hinge pin that stick out past the towers.
const upperLen = 110;
const pin = cylinder(100, 4).rotate([1, 0, 0], 90).translate(0, 50, 0);
const upper = arm.part(
  'upper-link',
  // Beam spans X; cheeks overlap beam in X and Y so the part is one solid.
  box(upperLen - 24, 14, 12, true)
    .translate(upperLen / 2, 0, 0)
    .union(box(36, 8, 28, true).translate(8, 10, 0))
    .union(box(36, 8, 28, true).translate(8, -10, 0))
    .union(pin)
    .union(box(28, 8, 22, true).translate(upperLen - 8, 10, 0))
    .union(box(28, 8, 22, true).translate(upperLen - 8, -10, 0)),
);
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});

arm.mate('servo-mount', 'base-frame.servo-mount', 'shoulder-servo.mount', 'fastened');
arm.mate('shoulder-pitch', 'base-frame.shoulder', 'upper-link.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 70],
});

// Driven hinge contract: towers + pin are the support; servo is the actuator.
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch',
  actuator: 'shoulder-servo',
  shaft: 'base-frame',
  supports: ['base-frame'],
  output: 'upper-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'base-frame.shoulder',
    supports: ['base-frame'],
    minBearingLengthMm: 28,
  },
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

Passive (unpowered) hinges: use `arm.jointSupport(...)` **and** `arm.tendon(...)`
across the joint so `mechanism.drops-on-release` passes — see
`examples/kinematic/luxo-lamp.kcad.ts`.

See also `examples/robot-arm/skill-built-supported-arm.kcad.ts` and
`docs/agent/adam-quality-bar.md`.
