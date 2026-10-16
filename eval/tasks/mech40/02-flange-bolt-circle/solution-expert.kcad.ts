// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/02: Ø80 × 8 flange, Ø30 bore, 6 × Ø6.6 on a 60 mm PCD (first on +X).
const od = 80;
const t = 8;
const pcd = 60;
const n = 6;
const positions = Array.from({ length: n }, (_, k) => {
  const a = (2 * Math.PI * k) / n;
  return { u: (pcd / 2) * Math.cos(a), v: (pcd / 2) * Math.sin(a) };
});

return cylinder(t, od / 2)
  .hole('top', { u: 0, v: 0, diameter: 30, depth: 'through', name: 'bore' })
  .holes('top', { positions, diameter: 6.6, depth: 'through', name: 'bolts' });
