// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const boltDiam = param('boltDiam', 5, { min: 4, max: 6 });

return box(20, 50, 6)
  .hole('top', { u: 0, v: 0, diameter: boltDiam, depth: 'through', name: 'mountBolt' })
  .patternLinear({ count: 6, direction: [1, 0, 0], spacing: 30 });
