// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// ISO 273 clearance holes, read back by lib.insert. A 6 mm plate carries four
// Ø4.5 holes (M4 normal fit) at the corners and two Ø4.3 holes (M4 close fit)
// on the centre line. lib.insert sizes each hole from its diameter, reports the
// thread and fit class it matched, and places M4 socket-head bolts with washers
// and nuts. The Ø5.0 centre hole is the M6 tap drill, not a clearance bore for
// any thread; asking lib.insert to fasten it is refused (see the guide
// docs/guide/metric-clearance-holes.md).
const plate = box(80, 50, 6, true)
  .holes('top', {
    positions: [{ u: -30, v: -15 }, { u: 30, v: -15 }, { u: -30, v: 15 }, { u: 30, v: 15 }],
    diameter: 4.5, // M4 normal (ISO 273 medium)
    depth: 'through',
  })
  .holes('top', {
    positions: [{ u: 0, v: -15 }, { u: 0, v: 15 }],
    diameter: 4.3, // M4 close (ISO 273 fine)
    depth: 'through',
  })
  .hole('top', { u: 0, v: 0, diameter: 5.0, depth: 'through' }) // M6 tap drill
  .finish('anodized');

// Corner holes: matched as M4, fit 'normal'.
const normal = await lib.insert(plate, {
  diameterMm: 4.5,
  family: 'socket-head-cap-screw',
  mode: 'bolt',
});
// Locating holes: matched as M4, fit 'close'.
const close = await lib.insert(normal.shape, {
  diameterMm: 4.3,
  family: 'socket-head-cap-screw',
  mode: 'bolt',
});

const fixture = assembly('clearance-hole-plate');
fixture.part('plate', close.shape);
[...normal.holes, ...close.holes].forEach((hole, index) => {
  const n = index + 1;
  fixture.part(`m4-${n}-${hole.fit}-screw`, hole.screw.finish('stainless'));
  if (hole.headWasher) fixture.part(`m4-${n}-head-washer`, hole.headWasher.finish('steel'));
  if (hole.tailWasher) fixture.part(`m4-${n}-tail-washer`, hole.tailWasher.finish('steel'));
  if (hole.nut) fixture.part(`m4-${n}-nut`, hole.nut.finish('steel'));
});

return fixture.model();
