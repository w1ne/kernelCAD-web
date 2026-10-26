// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The current fastener catalog on a display base: hex head bolt, socket head,
// countersunk, button head and set screw standing in the back row; hex nut,
// lock nut and the two washers lying in the middle; an M8 × 250 threaded rod
// in front. Default 'full' detail: sockets, chamfers and modeled ISO
// threads; the 250 mm rod (200 turns) draws its thread as revolved rings.
// The classic eight-part lineup stays in fastener-lineup.kcad.ts (at
// 'envelope') so its committed demo video still matches its source.
const baseW = 320;
const baseD = 110;

const base = box(baseW, baseD, 4, true)
  .translate(-15, 0, -2)
  .finish('anodized-black');

const lineup = assembly('catalog-lineup');
lineup.part('display-base', base);

// Back row: one instance per headed family, standing on the shank tip.
const socketHead = await lib.part({ family: 'socket-head-cap-screw', thread: 'M10', lengthMm: 40 });
lineup.part('socket-head', socketHead.translate(-150, 30, 40).finish('stainless'));

const hexBolt = await lib.part({ family: 'hex-head-bolt', thread: 'M10', lengthMm: 40 });
lineup.part('hex-head-bolt', hexBolt.translate(-105, 30, 40).finish('stainless'));

// Stand the countersunk screw on its head rim, point up, so the seated
// frustum reads as a head instead of a spike.
const flatHead = await lib.part({ family: 'flat-head-countersunk', thread: 'M8', lengthMm: 30 });
lineup.part('flat-head', flatHead.rotateX(180).translate(-62, 30, 0).finish('stainless'));

const buttonHead = await lib.part({ family: 'button-head-cap-screw', thread: 'M6', lengthMm: 25 });
lineup.part('button-head', buttonHead.translate(-25, 30, 25).finish('stainless'));

const setScrew = await lib.part({ family: 'set-screw', thread: 'M8', lengthMm: 30 });
lineup.part('set-screw', setScrew.translate(10, 30, 30).finish('steel'));

// Middle row: the mating hardware, lying flat.
const hexNut = await lib.part({ family: 'hex-nut', thread: 'M10' });
lineup.part('hex-nut', hexNut.translate(-150, 0, 0).finish('steel'));

const lockNut = await lib.part({ family: 'lock-nut', thread: 'M10' });
lineup.part('lock-nut', lockNut.translate(-113, 0, 0).finish('steel'));

const flatWasher = await lib.part({ family: 'flat-washer', thread: 'M10' });
lineup.part('flat-washer', flatWasher.translate(-76, 0, 0).finish('aluminium-brushed'));

const lockWasher = await lib.part({ family: 'lock-washer', thread: 'M10' });
lineup.part('lock-washer', lockWasher.translate(-39, 0, 0).finish('aluminium-brushed'));

// Front: a stocked M8 rod, lying along X with its axis 4 mm above the base.
const rod = await lib.part({ family: 'threaded-rod', thread: 'M8', lengthMm: 250 });
lineup.part('threaded-rod', rod.rotateY(90).translate(120, -32, 4).finish('stainless'));

return lineup.model();
