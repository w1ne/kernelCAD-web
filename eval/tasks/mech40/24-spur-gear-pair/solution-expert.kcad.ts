// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/24: module 1.5 spur pair, 16 / 32 teeth, centre distance m(z1 + z2)/2 = 36.
const m = 1.5;
const z1 = 16;
const z2 = 32;
const faceWidth = 10;
const backlash = 0.15;
const centreDistance = (m * (z1 + z2)) / 2;

const pinion = spurGear({ module: m, teeth: z1, faceWidth, bore: 6, backlash });
// Turn the gear half a pitch (z2 even) so a tooth space faces the pinion tooth on +X.
const gear = spurGear({ module: m, teeth: z2, faceWidth, bore: 8, backlash })
  .rotateZ(z2 % 2 === 0 ? 180 / z2 : 0)
  .translate(centreDistance, 0, 0);

const pair = assembly('spur-pair');
pair.part('pinion', pinion, { material: 'nylon' });
pair.part('gear', gear, { material: 'nylon' });
return pair.model();
