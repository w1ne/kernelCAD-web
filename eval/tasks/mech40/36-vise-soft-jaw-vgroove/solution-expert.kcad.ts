// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/36: vise soft jaw 100 × 20 × 30, 90° V-groove 6 deep along X, 2 × M5 counterbored along Y.
const L = 100;
const D = 20;
const H = 30;
const vDepth = 6;

// Counterbored holes first, while the box faces are unambiguous.
const jaw = box(L, D, H).holes('front', {
  positions: [{ u: -25, v: 12 - H / 2 }, { u: 25, v: 12 - H / 2 }],
  diameter: 5.5,
  depth: 'through',
  counterbore: { diameter: 10, depth: 5.5 },
});
// 90° V: a square bar turned 45° about X, centred 1 mm above the top so its
// lower corner sits 6 mm deep and it is 12 mm wide at the top face.
const half = (vDepth + 1) * Math.SQRT2;
const vee = box(L + 2, half, half, true).rotateX(45).translate(L / 2, D / 2, H + 1);
return jaw.subtract(vee);
