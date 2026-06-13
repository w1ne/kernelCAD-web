// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// All-three-gates-clean — small two-mate assembly that passes Gate 1
// (matched mounting holes), Gate 2 (joint axis intersects both bodies),
// and Gate 3 (no maxLoad declared, so nothing to exceed).
//
// Geometry:
//  - `hingeA` and `hingeB`: two box(10, 10, 10) blocks butted along +X
//    so the shared face sits at world x = 10. The revolute mate's axis
//    connectors sit at world [10, 5, 5] with axis [1, 0, 0]; the axis
//    line traverses both bodies (hingeA: x ∈ [0..10], hingeB: x ∈
//    [10..20]).
//  - `fixA` / `fixB`: two box(20, 20, 5) plates, each with a Ø5 through-
//    hole on the bound face — fastened mate joins them via topology-
//    bound face-center connectors. The plates live elsewhere in world
//    (offset in +Y) so they don't clash with the hinge pair.

const arm = assembly('all-three-clean-demo');

// --- revolute pair (Gate 2 binding via shared face crossing) ---
arm
  .part('hingeA', box(10, 10, 10), { at: [0, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [10, 5, 5] },
    axis: [1, 0, 0],
  });
arm
  .part('hingeB', box(10, 10, 10), { at: [10, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 5, 5] },
    axis: [1, 0, 0],
  });
arm.mate('hinge', 'hingeA.c', 'hingeB.c', 'revolute', { limitsDeg: [-10, 10] });

// --- fastened pair (Gate 1 matched holes) ---
const plateA = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
const plateB = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });

arm
  .part('fixA', plateA, { at: [0, 40, 0] })
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
arm
  .part('fixB', plateB, { at: [0, 40, 5] })
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
arm.mate('screw', 'fixA.h', 'fixB.h', 'fastened');

return arm.solvedModel({});
