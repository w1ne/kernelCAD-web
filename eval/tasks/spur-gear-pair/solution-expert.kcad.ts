// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Expert solution: spurGear generates involute teeth from the basic rack.
const m = 1.5;
const z1 = 18;
const z2 = 36;
const faceWidth = 8;
const centerDistance = m * (z1 + z2) / 2;

const pinion = spurGear({ module: m, teeth: z1, faceWidth, bore: 6 });
const gear = spurGear({ module: m, teeth: z2, faceWidth, bore: 10 })
  .rotateZ(z2 % 2 === 0 ? 180 / z2 : 0)
  .translate(centerDistance, 0, 0);

const pair = assembly('spur-gear-pair');
pair.part('pinion', pinion);
pair.part('gear', gear);
return pair.model();
