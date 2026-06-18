// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Repair-loop fixed half — Gate 1 stays silent because both mounting
// holes are now Ø5 mm. Same skeleton as
// kinematic-grounding-repair-loop-broken, single parameter delta.

const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });

const arm = assembly('repair-loop-fixed');

arm
  .part('a', a)
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
arm
  .part('b', b, { at: [0, 0, 5] })
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
arm.mate('screw', 'a.h', 'b.h', 'fastened');

return arm.solvedModel({});
