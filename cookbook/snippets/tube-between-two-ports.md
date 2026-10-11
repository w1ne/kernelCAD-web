---
id: tube-between-two-ports
title: Bent tube between two ports
tags: [tube-routing]
keywords:
  - bent tube between ports
  - tube port connector
  - tube via corner points
  - tube bend radius
  - hydraulic tube line
  - tubeSpec rules
  - tube.port.misaligned
when_to_use: >-
  You need one rigid tube from a fitting on one part to a fitting on another
  (a hydraulic, fuel, oil or coolant line). Declare each fitting as an axis
  connector with port data, pass part.port(name) as the tube ends, and give the
  corner points in between. The first corner goes on the first port's axis and
  the last corner on the second port's axis.
---

```typescript
// A 9.525 mm hydraulic tube from a pump outlet (top face, +Z) to a valve
// inlet (-X face), two 90 degree bends.
const asm = assembly('line');

// A port is an axis connector with `port: { system, od }`. The origin is in
// the part's own frame; the port position is `at` plus the origin.
const pump = asm.part('pump', box(60, 60, 60), { at: [0, 0, 0] })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [30, 30, 60] }, axis: [0, 0, 1], port: { system: 'hydraulic', od: 9.525 } });
const valve = asm.part('valve', box(40, 40, 40), { at: [200, 150, 100] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 20] }, axis: [-1, 0, 0], port: { system: 'hydraulic', od: 9.525 } });

// The rules every tube must meet. {} takes the defaults: bend radius 3 x OD,
// 2 x OD straight between bends, 2.5 x OD straight at each end, 6 mm clearance.
tubeSpec({});

// Leg lengths: an end leg needs bendRadius + 2.5 x OD = 52.4 mm, a leg
// between two 90 degree bends needs 2 x bendRadius + 2 x OD = 76.3 mm.
const line = tube('hyd-1', {
  from: pump.port('out'),   // [30, 30, 60], leaves along +Z
  to: valve.port('in'),     // [200, 170, 120], leaves along -X
  via: [
    [30, 30, 120],          // on the pump port axis, 60 mm above the outlet
    [30, 170, 120],         // on the valve port axis, 170 mm from the inlet
  ],
  wall: 0.89,
  bendRadius: 28.6,
});

// No `at`: the tube is already in assembly space.
asm.part('hyd-1', line);
return asm.model();
```
