// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Two 6 mm bars in a lap joint, held by one M5 socket-head stack. lib.stack
// places the washer under the head, the washer and hex nut on the back, and
// picks the stocked screw length that clears the 12 mm grip. Default 'full'
// detail; clash checks read the nominal envelopes, so the modeled thread in
// the nut is not a clash. Pair: examples/parts/fastener-lineup.kcad.ts.
const gripMm = 12;
const barT = 6;
const barL = 44;
const barW = 22;
const edge = 12; // overlap half-length: each bar reaches 12 mm past the hole
const clearanceD = 5.5;
const lift = 8; // keep the nut clear of the floor plane

// The bolt passes through a clearance hole at the joint centre: local u = +edge
// on the upper bar (world x = 0), local u = -edge on the lower one.
const topBar = box(barL, barW, barT, true)
  .translate(-edge, 0, lift + gripMm - barT / 2)
  .hole('top', { u: edge, v: 0, diameter: clearanceD, depth: 'through' })
  .finish('titanium');
const bottomBar = box(barL, barW, barT, true)
  .translate(edge, 0, lift + barT / 2)
  .hole('top', { u: -edge, v: 0, diameter: clearanceD, depth: 'through' })
  .finish('anodized');

// The seat is the upper bar's top face; the stack is built around it.
const seat = lift + gripMm;
const stack = await lib.stack({ thread: 'M5', gripMm, mode: 'bolt' });

const joint = assembly('bolt-stack');
joint.part('upper-bar', topBar);
joint.part('lower-bar', bottomBar);
joint.part('screw', stack.screw.translate(0, 0, seat).finish('stainless'));
joint.part('head-washer', stack.headWasher!.translate(0, 0, seat).finish('steel'));
joint.part('tail-washer', stack.tailWasher!.translate(0, 0, seat).finish('steel'));
joint.part('hex-nut', stack.nut!.translate(0, 0, seat).finish('steel'));

return joint.model();
