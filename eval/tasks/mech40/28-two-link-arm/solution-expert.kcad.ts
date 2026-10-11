// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/28: base + two links on vertical revolute joints, posed straight along +X.
const baseH = 20;
const barW = 16;
const barT = 8;
const l1 = 96;
const l2 = 76;
const pivotInset = 8;
const elbowX = 80;

const base = box(40, 40, baseH, true).translate(0, 0, baseH / 2);
const link1 = box(l1, barW, barT).translate(-pivotInset, -barW / 2, baseH);
const link2 = box(l2, barW, barT).translate(elbowX - pivotInset, -barW / 2, baseH + barT);

const arm = assembly('two-link-arm');
const b = arm.part('base', base, { material: 'aluminum-6061' });
const a1 = arm.part('link1', link1, { material: 'aluminum-6061' });
const a2 = arm.part('link2', link2, { material: 'aluminum-6061' });
const z = [0, 0, 1] as [number, number, number];
const at = (x: number, zz: number) => ({ kind: 'vec3' as const, value: [x, 0, zz] as [number, number, number] });
// Each joint origin sits on the shared face of the two parts it joins.
b.connector('shoulder', { type: 'axis', origin: at(0, baseH), axis: z });
a1.connector('shoulder', { type: 'axis', origin: at(0, baseH), axis: z });
a1.connector('elbow', { type: 'axis', origin: at(elbowX, baseH + barT), axis: z });
a2.connector('elbow', { type: 'axis', origin: at(elbowX, baseH + barT), axis: z });
arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('elbow', 'link1.elbow', 'link2.elbow', 'revolute', { limitsDeg: [-90, 90] });
return arm.solvedModel({});
