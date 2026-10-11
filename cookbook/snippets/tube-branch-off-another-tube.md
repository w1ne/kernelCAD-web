---
id: tube-branch-off-another-tube
title: Tube that branches off another tube (90 degree tee)
tags: [tube-routing]
keywords:
  - tube branch
  - tube tee
  - two tubes from one port
  - one line feeds two actuators
  - branch off a trunk tube
  - tube.clearance.overlap two tubes one port
  - tube.branch.too-close
when_to_use: >-
  One line has to feed two places: two tubes from the same port overlap and
  fail tube.clearance.overlap. Route one tube from the port (the trunk) and
  start the second on it with from: { tube, at, axis }. at is the distance
  along the trunk centreline from its from end, through straights and bends;
  axis is square to the trunk leg. The branch is cut to the trunk wall and the
  trunk is not drilled.
---

```typescript
// A 12.7 mm supply line from a valve block to actuator 1, with a branch to
// actuator 2 that tees off the trunk.
const asm = assembly('supply');

const block = asm.part('block', box(100, 100, 100), { at: [0, 0, 0] })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [50, 50, 100] }, axis: [0, 0, 1], port: { system: 'act', od: 12.7 } });
const act1 = asm.part('act-1', box(60, 60, 60), { at: [300, 20, 220] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 30, 30] }, axis: [-1, 0, 0], port: { system: 'act', od: 12.7 } });
const act2 = asm.part('act-2', box(60, 60, 60), { at: [-260, 20, 370] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [60, 30, 30] }, axis: [1, 0, 0], port: { system: 'act', od: 12.7 } });

tubeSpec({});

// Trunk: up from the block outlet at [50, 50, 100] to z = 250, one 90 degree
// bend of radius 40, then along +X to actuator 1 at [300, 50, 250].
const trunk = tube('act-supply', {
  from: block.port('out'), to: act1.port('in'),
  via: [[50, 50, 250]],
  wall: 0.9, bendRadius: 40,
});

// The tee is at x = 190 on the trunk's second leg. As a station on the trunk:
//   first straight   150 - 40           = 110
//   90 degree bend   40 * pi / 2        = 62.83
//   along the leg    190 - (50 + 40)    = 100
const teeAt = 110 + (40 * Math.PI) / 2 + 100;

// Branch: straight up from the tee (square to the trunk leg, which runs along
// X), then along -X to actuator 2. Its first corner is above the tee, on the
// branch axis. The od comes from the actuator port.
const branch = tube('act-supply-2', {
  from: { tube: 'act-supply', at: teeAt, axis: [0, 0, 1] },
  to: act2.port('in'),
  via: [[190, 50, 400]],
  wall: 0.9, bendRadius: 40,
});

// No `at`: both tubes are already in assembly space.
asm.part('act-supply', trunk);
asm.part('act-supply-2', branch);
return asm.model();
```
