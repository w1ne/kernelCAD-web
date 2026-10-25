// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Twelve-part gearbox blockout for the P1 assembly sequence planner. Parts are
// declared in REMOVAL order (cover first, base last) so the reverse peel is a
// bottom-up build sequence: base, posts, shafts, gears, cover. Every part is a
// straight-line removal along +Z in that order. The two fastened mate clusters
// (shaft + its two gears) are real subassembly candidates: the planner builds
// each one as a unit, then installs it at the top level. This is a geometry
// fixture, not a functioning transmission.

const arm = assembly('gearbox sequence');

const cover = box(90, 70, 6, true).translate(0, 0, 39).finish('anodized');
const gearA = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(-18, 0, 10).finish('brass');
const gearB = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(-18, 0, 22).finish('brass');
const gearC = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(18, 0, 10).finish('brass');
const gearD = box(20, 20, 8, true).subtract(box(8, 8, 8, true)).translate(18, 0, 22).finish('brass');
const inputShaft = box(6, 6, 30, true).translate(-18, 0, 21).finish('steel');
const outputShaft = box(6, 6, 30, true).translate(18, 0, 21).finish('steel');
const postA = box(8, 8, 28, true).translate(-36, -26, 20).finish('aluminium-brushed');
const postB = box(8, 8, 28, true).translate(36, -26, 20).finish('aluminium-brushed');
const postC = box(8, 8, 28, true).translate(-36, 26, 20).finish('aluminium-brushed');
const postD = box(8, 8, 28, true).translate(36, 26, 20).finish('aluminium-brushed');
const base = box(90, 70, 6, true).translate(0, 0, 3).finish('anodized');

arm.part('cover', cover);
const gearDRef = arm.part('gear-d', gearD);
const gearCRef = arm.part('gear-c', gearC);
const gearBRef = arm.part('gear-b', gearB);
const gearARef = arm.part('gear-a', gearA);
const outputShaftRef = arm.part('output-shaft', outputShaft);
const inputShaftRef = arm.part('input-shaft', inputShaft);
arm.part('post-d', postD);
arm.part('post-c', postC);
arm.part('post-b', postB);
arm.part('post-a', postA);
arm.part('base', base);

// Frame connectors are mate metadata, not geometry: the planner groups the
// cluster and plans its inside; it does not solve the mates in this example.
const seat = (value: [number, number, number]) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value } });
inputShaftRef.connector('gear-a-seat', seat([0, 0, -11])).connector('gear-b-seat', seat([0, 0, 1]));
outputShaftRef.connector('gear-c-seat', seat([0, 0, -11])).connector('gear-d-seat', seat([0, 0, 1]));
gearARef.connector('shaft-mount', seat([0, 0, 0]));
gearBRef.connector('shaft-mount', seat([0, 0, 0]));
gearCRef.connector('shaft-mount', seat([0, 0, 0]));
gearDRef.connector('shaft-mount', seat([0, 0, 0]));
arm.mate('input-shaft-gear-a', 'input-shaft.gear-a-seat', 'gear-a.shaft-mount', 'fastened');
arm.mate('input-shaft-gear-b', 'input-shaft.gear-b-seat', 'gear-b.shaft-mount', 'fastened');
arm.mate('output-shaft-gear-c', 'output-shaft.gear-c-seat', 'gear-c.shaft-mount', 'fastened');
arm.mate('output-shaft-gear-d', 'output-shaft.gear-d-seat', 'gear-d.shaft-mount', 'fastened');

return arm.model();
