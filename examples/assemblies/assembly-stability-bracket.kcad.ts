// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// P3 approximate static-stability fixture. The base has a left pedestal, a
// lower shelf and a tall post. The cantilever rests only on the pedestal; the
// narrow support stands on the shelf under its free end. The planner's
// outside-in peel places the cantilever before that support, so the P3
// support-polygon projection flags it `needs-hold` until the support exists.
// This is a geometry fixture, not a tested structure.

const arm = assembly('stability-bracket');

// Centered boxes; dimensions are chosen so the cantilever's centre of mass
// projects well outside the pedestal contact at its left end.
const pedestal = box(4, 4, 2, true).translate(0, 0, 1);
const shelf = box(10.1, 4, 1, true).translate(6.95, 0, 0.5);
const post = box(0.5, 0.5, 3.5, true).translate(-1.75, -1.75, 1.75);
const base = pedestal.union(shelf).union(post).finish('aluminium-brushed');
const cantilever = box(13, 2, 0.99, true).translate(5.5, 0, 2.505).finish('aluminium-brushed');
const support = box(0.5, 2, 0.98, true).translate(11.25, 0, 1.5).finish('steel');

arm.part('base', base, { material: 'aluminum-6061' });
arm.part('z-cantilever', cantilever, { material: 'aluminum-6061' });
arm.part('a-support', support, { material: 'mild-steel' });

return arm.model();
