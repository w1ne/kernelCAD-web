---
id: sweep-tolerance-hole-diameter
title: Sweep a param-driven bore diameter through the mounting-hole gate
tags: [sweep-tolerance, kinematic, tolerance]
keywords:
  - sweep bore diameter param
  - mounting-hole consistency across a tolerance range
  - ParamRef diameter sweepTolerance
  - fastener bore mismatch envelope
when_to_use: A fastened pair of parts has a param()-driven bore diameter and you need to know at which value the mounting-hole gate flips from pass to fail, rather than only checking the nominal.
---

A `.hole({ diameter: someParam })` feature is resolved by the mounting-hole
gate against the live param table. Sweep that param with
`kinematic.sweepTolerance` and read `firstFailure['mounting-holes']`.

```typescript
const code = `
  const arm = assembly('sweep-hole-dia');
  const d = param('HoleDia', 5);
  const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: d, depth: 'through' });
  const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
  arm.part('a', a).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
  arm.part('b', b).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
  arm.mate('screw', 'a.h', 'b.h', 'fastened');
  return arm.solvedModel({});
`;

const sweep = await kinematic.sweepTolerance({
  code,
  params: { HoleDia: { values: [5, 6] } },
  gates: { interference: false, mountingHoles: true, jointAxis: false },
});
if (sweep.source !== 'local') throw new Error('sweep: source !== local');
if (sweep.ok) throw new Error('sweep: expected ok=false (HoleDia=6 mismatches)');
const firstFail = sweep.firstFailure['mounting-holes'];
if (!firstFail || firstFail.combo['HoleDia'] !== 6)
  throw new Error('sweep: expected HoleDia=6 as the first mounting-holes failure');

return box(10, 10, 10);
```
