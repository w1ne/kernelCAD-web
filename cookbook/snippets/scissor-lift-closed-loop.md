---
id: scissor-lift-closed-loop
title: Scissor-lift table — open-chain lift DOF + mid-pose X-links (closed-loop FK unsupported)
tags: [assembly, connector, mate, prismatic, joint, kinematic, plate, parameter, scissor, lift]
keywords:
  - scissor lift
  - scissor-lift table
  - industrial scissor jack
  - closed-loop scissor
  - pin_slot scissor
  - joint.scissorLift
  - raising platform animationView
  - X-pattern lift table
  - production scissor lift mechanism=real
when_to_use: >-
  Prompt asks for a scissor-lift / scissor-jack table with base, platform,
  X-pattern links, mechanism=real, and animationView raising the platform.
  IMPORTANT: articulated closed-loop FK (true revolute + pin_slot scissor that
  solves both slider ends from one lift-height DOF) is UNSUPPORTED — it emits
  assembly.solver.did-not-converge / kinematic.solver.unsupported-config. Do
  NOT invent joint.scissorLift(...) or close the loop with pin_slot. Use this
  open-chain production pattern: one prismatic platform DOF (+ mechanicalJoint)
  driven by platformZ, industrial X-links fused into base-frame at a
  representative mid pose, animationView raising the platform. Keep the
  actuator-mount fastener on solid (center pad under the actuator) so
  evaluate_script mechanism=real — dry-run / cookbook:evaluate alone miss
  joint-mesh-gap. Prefer design_loop until green. Gallery
  examples/gallery/scissor-lift.kcad.ts is fastened pose-only (not
  mechanism-driven).
---

```typescript
// Open-chain industrial scissor table. Closed-loop revolute+pin_slot FK is
// unsupported (assembly.solver.did-not-converge). One prismatic DOF raises the
// platform; X-links are fused into base-frame at a mid working pose (ParamRef
// cannot drive Math.sqrt link geometry). Do not invent joint.scissorLift.

const platformZ = param('platformZ', 110, { min: 80, max: 150 });

const linkLen = 160;
const linkW = 10;
const linkT = 8;
const sideY = 28;
const railY = 38;
const baseZ = 10;
// Representative mid-pose height for the visual X-pattern (not closed-loop synced).
const stageH = 100;
const halfSpan = Math.sqrt(Math.max(400, linkLen * linkLen - stageH * stageH)) / 2;
const deckZ = baseZ + stageH;

const arm = assembly('scissor-lift-open-chain');

function linkBar(x1: number, z1: number, x2: number, z2: number, y: number, color: string) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = (Math.atan2(dz, dx) * 180) / Math.PI;
  return box(len, linkW, linkT, true)
    .fillet(1)
    .rotate([0, 1, 0], -angle)
    .translate((x1 + x2) / 2, y, (z1 + z2) / 2)
    .color(color);
}

const scissorX = linkBar(-halfSpan, baseZ, halfSpan, deckZ, -sideY, '#f6b23b')
  .union(linkBar(-halfSpan, baseZ, halfSpan, deckZ, sideY, '#f6b23b'))
  .union(linkBar(halfSpan, baseZ, -halfSpan, deckZ, -sideY, '#f0782f'))
  .union(linkBar(halfSpan, baseZ, -halfSpan, deckZ, sideY, '#f0782f'));

// Center actuator pad tops at z=12 so actuator-fix sits on solid (not mid-air
// between the side rails). Pad spans rail-to-rail so it fuses into the frame.
const actuatorPad = box(40, railY * 2, 12, true).translate(0, 0, 6).color('#3b434c');

const base = arm.part(
  'base-frame',
  box(halfSpan * 2 + 50, 10, 10, true)
    .translate(0, -railY, 5)
    .color('#2b3036')
    .union(box(halfSpan * 2 + 50, 10, 10, true).translate(0, railY, 5).color('#2b3036'))
    .union(box(20, railY * 2 + 20, 8, true).translate(-halfSpan - 16, 0, 4).color('#3b434c'))
    .union(box(20, railY * 2 + 20, 8, true).translate(halfSpan + 16, 0, 4).color('#3b434c'))
    .union(actuatorPad)
    .union(scissorX),
);
base.connector('lift-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
base.connector('actuator-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 12] },
});

const actuator = arm.part(
  'lift-actuator',
  box(28, 22, 18, true).translate(0, 0, 21).color('actuator'),
);
actuator.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 12] },
});

const platform = arm.part(
  'platform',
  box(halfSpan * 2 + 56, railY * 2 + 24, 8, true)
    .fillet(2)
    .translate(0, 0, 4)
    .color('#dfe5ea')
    .union(box(halfSpan * 2 + 36, 6, 8, true).translate(0, -railY, -4).color('#aeb7bf'))
    .union(box(halfSpan * 2 + 36, 6, 8, true).translate(0, railY, -4).color('#aeb7bf')),
);
platform.connector('lift-slide', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

arm.mate('actuator-fix', 'base-frame.actuator-mount', 'lift-actuator.mount', 'fastened');
arm.mate('platform-lift', 'base-frame.lift-axis', 'platform.lift-slide', 'prismatic', {
  pose: platformZ,
  limitsMm: [80, 150],
});

arm.mechanicalJoint('platform-drive', {
  mate: 'platform-lift',
  actuator: 'lift-actuator',
  shaft: 'base-frame',
  supports: ['base-frame'],
  output: 'platform',
  requiredSupport: {
    kind: 'bracket',
    around: 'base-frame.lift-axis',
    supports: ['base-frame'],
    minBearingLengthMm: 20,
  },
});

animationView({
  name: 'raise platform',
  tracks: [
    {
      param: 'platformZ',
      keys: [
        { atMs: 0, value: 90 },
        { atMs: 1600, value: 140, ease: 'easeInOut' },
        { atMs: 2800, value: 90, ease: 'easeInOut' },
      ],
    },
  ],
  fps: 24,
});

return arm.solvedModel({}, {
  ignore: [['base-frame', 'platform']],
});
```
