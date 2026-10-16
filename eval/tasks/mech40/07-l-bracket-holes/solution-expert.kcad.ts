// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/07: L-bracket 60 × 40 × 50, 5 thick, 2 × Ø5.5 per leg.
const t = 5;
const width = 40;
const base = box(60, width, t)
  // top face centre is x = 30, y = 20: holes at x = 40, y = 10 / 30
  .holes('top', { positions: [{ u: 10, v: -10 }, { u: 10, v: 10 }], diameter: 5.5, depth: 'through' });
// Upright overlaps the base by 0.1 mm so the union is one solid.
const upright = box(t, width, 50 - t + 0.1)
  // 'right' face (+X): u = +Y, v = +Z from the face centre (z = 4.9 + 22.55)
  .holes('right', { positions: [{ u: -10, v: 35 - (t - 0.1) - (50 - t + 0.1) / 2 }, { u: 10, v: 35 - (t - 0.1) - (50 - t + 0.1) / 2 }], diameter: 5.5, depth: 'through' })
  .translate(0, 0, t - 0.1);

return union(base, upright);
