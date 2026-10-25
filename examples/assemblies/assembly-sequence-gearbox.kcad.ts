// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Twelve-part gearbox blockout for the P1 assembly sequence planner. Parts are
// declared in REMOVAL order (cover first, base last) so the reverse peel is a
// bottom-up build sequence: base, posts, shafts, gears, cover. Every part is a
// straight-line removal along +Z in that order. This is a geometry fixture,
// not a functioning transmission.

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
arm.part('gear-d', gearD);
arm.part('gear-c', gearC);
arm.part('gear-b', gearB);
arm.part('gear-a', gearA);
arm.part('output-shaft', outputShaft);
arm.part('input-shaft', inputShaft);
arm.part('post-d', postD);
arm.part('post-c', postC);
arm.part('post-b', postB);
arm.part('post-a', postA);
arm.part('base', base);

return arm.model();
