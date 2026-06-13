// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const boltDiam = 6;

return box(60, 60, 12).hole('top', {
  u: 0, v: 0,
  diameter: boltDiam,
  depth: 'through',
  counterbore: { diameter: boltDiam + 5, depth: 4 },
});
