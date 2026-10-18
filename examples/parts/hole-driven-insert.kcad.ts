// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A drilled plate gets its fasteners from the holes. Four Ø5.5 bores take M5
// countersunk flat heads (lib.insert cuts the seat the family needs) and two
// Ø3.4 bores take M3 socket-head screws (no seat). Threads, lengths, seats
// and member placement all come from the hole geometry.
const plate = box(80, 50, 8, true)
  .holes('top', {
    positions: [{ u: -28, v: -16 }, { u: 28, v: -16 }, { u: -28, v: 16 }, { u: 28, v: 16 }],
    diameter: 5.5,
    depth: 'through',
  })
  .holes('top', {
    positions: [{ u: 0, v: -16 }, { u: 0, v: 16 }],
    diameter: 3.4,
    depth: 'through',
  })
  .finish('anodized');

// Flat heads: seat is cut by the family, washers and nuts land on the back.
const countersunk = await lib.insert(plate, {
  diameterMm: 5.5,
  family: 'flat-head-countersunk',
  mode: 'bolt',
  gripMm: 8,
});
// Socket heads: no seat, screw alone through the plate.
const screwed = await lib.insert(countersunk.shape, {
  diameterMm: 3.4,
  family: 'socket-head-cap-screw',
  mode: 'screw',
  gripMm: 8,
});

const fixture = assembly('hole-driven-insert');
fixture.part('plate', screwed.shape);
countersunk.holes.forEach((hole, index) => {
  const n = index + 1;
  fixture.part(`m5-${n}-screw`, hole.screw.finish('stainless'));
  if (hole.headWasher) fixture.part(`m5-${n}-head-washer`, hole.headWasher.finish('steel'));
  if (hole.tailWasher) fixture.part(`m5-${n}-tail-washer`, hole.tailWasher.finish('steel'));
  if (hole.nut) fixture.part(`m5-${n}-nut`, hole.nut.finish('steel'));
});
screwed.holes.forEach((hole, index) => {
  fixture.part(`m3-${index + 1}-screw`, hole.screw.finish('stainless'));
});

return fixture.model();
