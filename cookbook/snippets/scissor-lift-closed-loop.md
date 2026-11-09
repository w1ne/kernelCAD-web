---
id: scissor-lift-closed-loop
title: Scissor-lift table — sweep-clear open-chain layout scaffold
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
  - scissor-lift open-chain collision check
when_to_use: >-
  Prompt asks for a scissor-like table layout scaffold with a single prismatic
  platform DOF and decorative X-links fused into the frame at a representative
  mid pose. The links are outboard of the platform and its ribs, so the
  authored [80, 150] mm platform travel is sweep-clear. This remains an
  open-chain table with fixed links: ParamRef cannot drive the Math.sqrt link
  geometry, so it is not a solved closed-loop scissor. For the closed-loop
  mechanism use the kernelcad-kinematic cookbook 04-scissor-jack-swept. Do NOT
  invent joint.scissorLift(...). Gallery examples/gallery/scissor-lift.kcad.ts
  is fastened pose-only (not mechanism-driven).
---

```typescript
// Open-chain scissor-table layout scaffold. One prismatic DOF raises the
// platform; decorative X-links are fused into base-frame at the rest pose
// because ParamRef cannot drive Math.sqrt link geometry. They stay outboard
// of the platform and its ribs through the full travel, but are not a solved
// closed-loop scissor (crossed links + sliders, lift angle driven); that is
// the separate kernelcad-kinematic cookbook 04.
// Do not invent joint.scissorLift.

const platformZ = param('platformZ', 110, { min: 80, max: 150 });

const linkLen = 160;
const linkW = 10;
const linkT = 8;
const railY = 38;
// The platform is 100 mm wide in Y. Keep the 10 mm links 0.5 mm beyond its
// side faces; short feet below the platform's minimum height bridge them to
// the base rails without entering the moving platform's envelope.
const sideY = railY + 12 + linkW / 2 + 0.5;
const baseZ = 10;
// The fused X-pattern is drawn at the rest pose (platformZ = 110). Solve the
// link centreline for the deck underside, then raise the outboard bar ends
// slightly so the base/platform mate stays within the contact tolerance.
const restDeckZ = 110;
let stageH = 100;
for (let i = 0; i < 8; i++) {
  const angle = Math.asin(Math.min(1, stageH / linkLen));
  stageH = restDeckZ - baseZ - (linkT / 2) * Math.cos(angle);
}
const halfSpan = Math.sqrt(Math.max(400, linkLen * linkLen - stageH * stageH)) / 2;
const deckZ = baseZ + stageH + 2;

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

const scissorMounts = box(20, 20, 12, true).translate(-halfSpan, -49, 9).color('#3b434c')
  .union(box(20, 20, 12, true).translate(-halfSpan, 49, 9).color('#3b434c'))
  .union(box(20, 20, 12, true).translate(halfSpan, -49, 9).color('#3b434c'))
  .union(box(20, 20, 12, true).translate(halfSpan, 49, 9).color('#3b434c'));

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
    .union(scissorMounts)
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

return arm.solvedModel({});
```
