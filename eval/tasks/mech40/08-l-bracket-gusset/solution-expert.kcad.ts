// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/08: L-bracket 60 × 40 × 50, 5 thick, centred 30 × 30 gusset, 2 × Ø5.5 per leg.
const t = 5;
const width = 40;
const gussetT = 5;
const gussetLeg = 30;
const base = box(60, width, t)
  .holes('top', { positions: [{ u: 10, v: -10 }, { u: 10, v: 10 }], diameter: 5.5, depth: 'through' });
const uprightH = 50 - t + 0.1;
const upright = box(t, width, uprightH)
  .holes('right', { positions: [{ u: -10, v: 35 - (t - 0.1) - uprightH / 2 }, { u: 10, v: 35 - (t - 0.1) - uprightH / 2 }], diameter: 5.5, depth: 'through' })
  .translate(0, 0, t - 0.1);
// Triangle in the XZ plane (drawn in XY, extruded along Z, turned so Z → -Y),
// legs measured from the inside corner (5, 5); 0.1 mm into both legs.
const c = t - 0.1;
const gusset = extrudePolygon([[c, c], [t + gussetLeg, c], [c, t + gussetLeg]], gussetT)
  .rotateX(90)
  .translate(0, width / 2 + gussetT / 2, 0);

return union(base, upright, gusset);
