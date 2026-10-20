// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One instance of every fastener family the library stocks, on a display
// base. Geometry is the table envelope: head plus shank, no helical thread.
// Pair: examples/parts/bolt-stack.kcad.ts.
const row = 14; // row offset in Y
const base = box(104, 2 * row + 20, 4, true).translate(0, 0, -2).finish('anodized-black');

const lineup = assembly('fastener-lineup');
lineup.part('display-base', base);

// Back row: the three screw heads, standing on their shank tips.
const socketHead = await lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });
lineup.part('socket-head', socketHead.translate(-26, row, 16).finish('stainless'));

const buttonHead = await lib.part({ family: 'button-head-cap-screw', thread: 'M5', lengthMm: 16 });
lineup.part('button-head', buttonHead.translate(0, row, 16).finish('stainless'));

const flatHead = await lib.part({ family: 'flat-head-countersunk', thread: 'M5', lengthMm: 16 });
lineup.part('flat-head', flatHead.translate(26, row, 16).finish('stainless'));

// Front row: nuts and washers lie flat.
const hexNut = await lib.part({ family: 'hex-nut', thread: 'M5' });
lineup.part('hex-nut', hexNut.translate(-39, -row, 0).finish('steel'));

const lockNut = await lib.part({ family: 'lock-nut', thread: 'M5' });
lineup.part('lock-nut', lockNut.translate(-13, -row, 0).finish('steel'));

const flatWasher = await lib.part({ family: 'flat-washer', thread: 'M5' });
lineup.part('flat-washer', flatWasher.translate(13, -row, 0).finish('aluminium-brushed'));

const lockWasher = await lib.part({ family: 'lock-washer', thread: 'M5' });
lineup.part('lock-washer', lockWasher.translate(39, -row, 0).finish('aluminium-brushed'));

return lineup.model();
