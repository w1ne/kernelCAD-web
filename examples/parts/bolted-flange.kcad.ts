// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A bolted flange ring. Eight Ø6.6 bores sit on an 85 mm bolt circle; lib.insert
// sizes every one to M6, cuts the 90° countersink the flat head needs and places
// the screw, tail washer and nut. Grip 10 mm: 10 + 1.6 washer + 5 nut = 16.6,
// so the stocked screw is M6 × 18. Pair: examples/parts/bolt-stack.kcad.ts.
const outerR = 55;
const innerR = 27.5;
const thickness = 10;
const boltCircleR = 42.5;
const boltCount = 8;
const clearanceD = 6.6; // ISO 273 normal clearance for M6

const positions = Array.from({ length: boltCount }, (_, i) => {
  const angle = (i * 2 * Math.PI) / boltCount;
  return { u: boltCircleR * Math.cos(angle), v: boltCircleR * Math.sin(angle) };
});

const ring = cylinder(thickness, outerR)
  .subtract(cylinder(thickness, innerR))
  .holes('top', { positions, diameter: clearanceD, depth: 'through' })
  .finish('anodized');

const fitted = await lib.insert(ring, {
  diameterMm: clearanceD,
  family: 'flat-head-countersunk',
  mode: 'bolt',
});

const flange = assembly('bolted-flange');
flange.part('ring', fitted.shape);
fitted.holes.forEach((hole, index) => {
  const n = index + 1;
  flange.part(`m6-${n}-screw`, hole.screw.finish('stainless'));
  if (hole.tailWasher) flange.part(`m6-${n}-tail-washer`, hole.tailWasher.finish('steel'));
  if (hole.nut) flange.part(`m6-${n}-nut`, hole.nut.finish('steel'));
});

return flange.model();
