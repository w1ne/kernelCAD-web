---
id: tube-clearance-between-fluid-lines
title: Two fluid lines with a clearance rule between their systems
tags: [tube-routing]
keywords:
  - tube clearance between lines
  - fuel line hydraulic line clearance
  - tubeSpec clearance pairs
  - parallel tube runs
  - fluid system clearance
  - tube.clearance.violated
when_to_use: >-
  Two or more tubes of different fluid systems run close together and the
  systems must keep a set distance apart (fuel from hydraulic, fuel from bleed
  air). Name the system on each port, declare the distance in
  tubeSpec({ clearance: { pairs } }), and run the lines side by side at a pitch
  that keeps the gap. The gate measures surface to surface and names both lines
  when the gap is too small.
---

```typescript
// A fuel line and a hydraulic line leave one block, run side by side and
// end on a second block. The two systems must stay 12 mm apart.
const asm = assembly('two-lines');

// Each boss is fused to its block, so the block owns the port and the tube
// may touch it there.
const supply = asm.part('supply', box(120, 60, 60), { at: [0, 0, 0] })
  .connector('fuel-out', { type: 'axis', origin: { kind: 'vec3', value: [30, 30, 60] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } })
  .connector('hyd-out', { type: 'axis', origin: { kind: 'vec3', value: [90, 30, 60] }, axis: [0, 0, 1], port: { system: 'hydraulic', od: 9.525 } });
const user = asm.part('user', box(60, 120, 60), { at: [300, 200, 120] })
  .connector('fuel-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 90, 30] }, axis: [-1, 0, 0], port: { system: 'fuel', od: 12.7 } })
  .connector('hyd-in', { type: 'axis', origin: { kind: 'vec3', value: [0, 30, 30] }, axis: [-1, 0, 0], port: { system: 'hydraulic', od: 9.525 } });

// 6 mm from a tube to anything; 12 mm between a fuel tube and a hydraulic tube.
tubeSpec({ clearance: { default: 6, pairs: [{ a: 'fuel', b: 'hydraulic', min: 12 }] } });

// Both lines rise to z = 150, run along +Y, then turn into the user block.
// The Y runs are 60 mm apart in X; with ODs of 12.7 and 9.525 the gap between
// the tube surfaces is 60 - 6.35 - 4.76 = 48.9 mm.
const fuel = tube('fuel-1', {
  from: supply.port('fuel-out'),   // [30, 30, 60], +Z
  to: user.port('fuel-in'),        // [300, 290, 150], -X
  via: [[30, 30, 150], [30, 290, 150]],
  wall: 0.89,
  bendRadius: 38.1,
});
const hyd = tube('hyd-1', {
  from: supply.port('hyd-out'),    // [90, 30, 60], +Z
  to: user.port('hyd-in'),         // [300, 230, 150], -X
  via: [[90, 30, 150], [90, 230, 150]],
  wall: 0.89,
  bendRadius: 28.6,
});

asm.part('fuel-1', fuel.color('#d9822b'));
asm.part('hyd-1', hyd.color('#2f6fb5'));
return asm.model();
```
