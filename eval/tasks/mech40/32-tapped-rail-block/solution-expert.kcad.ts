// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/32: 60 × 20 × 15 block, 3 × M4 tapped 10 deep on top, 2 × Ø4.5 through along Y.
return box(60, 20, 15)
  .holes('top', {
    positions: [{ u: -20, v: 0 }, { u: 0, v: 0 }, { u: 20, v: 0 }],
    diameter: 4,
    depth: 10,
    thread: { pitch: 0.7 },
    name: 'tapped',
  })
  // 'front' (-Y): u = +X, v = +Z from the face centre (30, 7.5)
  .holes('front', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 4.5, depth: 'through', name: 'clearance' });
