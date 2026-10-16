// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/37: 150 × 100 × 12 fixture plate, 6 × 4 grid of M6 × 1 tapped through holes at 25 mm.
const cols = 6;
const rows = 4;
const pitch = 25;
const positions: { u: number; v: number }[] = [];
for (let i = 0; i < cols; i++) {
  for (let j = 0; j < rows; j++) positions.push({ u: (i - (cols - 1) / 2) * pitch, v: (j - (rows - 1) / 2) * pitch });
}

return box(150, 100, 12).holes('top', { positions, diameter: 6, depth: 'through', thread: { pitch: 1 }, name: 'grid' });
