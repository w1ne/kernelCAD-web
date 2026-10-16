// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/26: print-in-place hinge — leaf A (outer knuckles + pin), leaf B (middle knuckle, Ø2.4 bore).
// 5 mm gaps between knuckles and a pin standing 2 mm proud keep the hinge
// readable as a hinge (the joint-visibility gate); radial play is 0.2 mm.
const len = 40;
const leafW = 25;
const t = 2;
const knuckleR = 3;
const axisZ = 3;
const pinR = 1;
const gap = 0.2;
const outerEnd = 10;
const midStart = 15;
const midEnd = 25;
const pinOver = 2;
const plateEdge = knuckleR + gap; // plate edge clears the other leaf's knuckle

/** Knuckle along X from x0 to x1 on the pin axis. */
const knuckle = (x0: number, x1: number) => cylinder(x1 - x0, knuckleR).rotateY(90).translate(x0, 0, axisZ);
/** Tab tying a plate to its own knuckle over x0..x1 (side = -1 for A, +1 for B). */
const tab = (x0: number, x1: number, side: number) =>
  box(x1 - x0, 1.4, t).translate(x0, side < 0 ? -plateEdge - 0.1 : plateEdge - 1.3, 0);

const leafA = union(
  box(len, leafW - plateEdge, t).translate(0, -leafW, 0),
  tab(0, outerEnd, -1),
  tab(len - outerEnd, len, -1),
  knuckle(0, outerEnd),
  knuckle(len - outerEnd, len),
  cylinder(len + 2 * pinOver, pinR).rotateY(90).translate(-pinOver, 0, axisZ),
);
const leafB = union(
  box(len, leafW - plateEdge, t).translate(0, plateEdge, 0),
  tab(midStart, midEnd, 1),
  knuckle(midStart, midEnd),
).subtract(cylinder(len + 2 * pinOver + 2, pinR + gap).rotateY(90).translate(-pinOver - 1, 0, axisZ));

const hinge = assembly('print-in-place-hinge');
const a = hinge.part('leafA', leafA, { material: 'pla' });
const b = hinge.part('leafB', leafB, { material: 'pla' });
a.connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [len / 2, 0, axisZ] }, axis: [1, 0, 0] });
b.connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [len / 2, 0, axisZ] }, axis: [1, 0, 0] });
hinge.mate('hinge', 'leafA.pin', 'leafB.pin', 'revolute', { limitsDeg: [0, 180] });
return hinge.solvedModel({});
