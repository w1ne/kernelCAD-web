// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/11: clevis 40 × 30 × 30 — base 4 thick, cheeks 4 thick, Ø6.2 pin hole at z = 22.
const L = 40;
const W = 30;
const baseT = 4;
const cheekT = 4;
const H = 30;
const pinZ = 22;

const base = box(L, W, baseT).holes('top', { positions: [{ u: -12, v: 0 }, { u: 12, v: 0 }], diameter: 4.5, depth: 'through' });
const z0 = baseT - 0.1;
const cheekH = H - z0;
const cheek = (y: number) => box(L, cheekT, cheekH)
  .hole('front', { u: 0, v: pinZ - z0 - cheekH / 2, diameter: 6.2, depth: 'through' })
  .translate(0, y, z0);

return union(base, cheek(0), cheek(W - cheekT));
