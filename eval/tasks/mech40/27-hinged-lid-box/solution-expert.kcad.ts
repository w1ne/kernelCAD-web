// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/27: 80 × 60 × 30 box, 2 mm walls, 3 mm lid hinged on the top back edge (0–110°).
const L = 80;
const W = 60;
const H = 30;
const wall = 2;
const lidT = 3;

const base = box(L, W, H).subtract(box(L - 2 * wall, W - 2 * wall, H).translate(wall, wall, wall));
const lid = box(L, W, lidT).translate(0, 0, H);

const arm = assembly('hinged-box');
const b = arm.part('base', base, { material: 'pla' });
const l = arm.part('lid', lid, { material: 'pla' });
// Hinge line: the top back edge (y = W, z = H) along X — on both parts' boundaries.
const hingeAt = { kind: 'vec3' as const, value: [L / 2, W, H] as [number, number, number] };
b.connector('hinge', { type: 'axis', origin: hingeAt, axis: [1, 0, 0] });
l.connector('hinge', { type: 'axis', origin: hingeAt, axis: [1, 0, 0] });
arm.mate('lidHinge', 'base.hinge', 'lid.hinge', 'revolute', { limitsDeg: [0, 110] });
return arm.solvedModel({});
