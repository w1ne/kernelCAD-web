// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/03: 120 × 80 × 4 panel, 5 × 3 grid of Ø8 holes at 20 mm pitch, centred.
const cols = 5;
const rows = 3;
const pitch = 20;
const positions: { u: number; v: number }[] = [];
for (let i = 0; i < cols; i++) {
  for (let j = 0; j < rows; j++) {
    positions.push({ u: (i - (cols - 1) / 2) * pitch, v: (j - (rows - 1) / 2) * pitch });
  }
}

return box(120, 80, 4).holes('top', { positions, diameter: 8, depth: 'through' });
