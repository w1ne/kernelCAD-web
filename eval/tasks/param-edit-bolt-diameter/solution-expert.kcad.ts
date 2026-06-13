// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const boltDia = param('boltDia', 5, {
  min: 3,
  max: 10,
  description: 'bolt hole diameter',
});

return box(80, 60, 6)
  .holes('top', {
    positions: [
      { u: -30, v: -20 },
      { u: 30, v: -20 },
      { u: -30, v: 20 },
      { u: 30, v: 20 },
    ],
    diameter: boltDia,
    depth: 'through',
    name: 'mountBolts',
  })
  .fillet(0.2, { face: 'mountBolts.wall' });
