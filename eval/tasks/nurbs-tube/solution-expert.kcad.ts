// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Polygonal NURBS tube: 16-sided approximation of a circle.
// Slice-1 ships non-rational surfaces only, so we use a fine polygon
// (degree 1 in U) rather than a 3-point rational quarter-circle.
const r = 5;
const L = 40;
const N = 16;
const ring: number[][][] = [];
for (let i = 0; i <= N; i++) {
  const theta = (i / N) * 2 * Math.PI;
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  ring.push([[x, y, 0], [x, y, L]]);
}
return nurbsSurface({
  controls: ring,
  degree: { u: 1, v: 1 },
}).thicken(1);
