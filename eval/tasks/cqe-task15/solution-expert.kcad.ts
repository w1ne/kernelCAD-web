// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Loft: circle (40 mm diameter) at z=0 → square (30 mm side) at z=40.
//
// Reference bbox: X = [-20, 20], Y = [-20, 20], Z = [0, 40]. The XY bounds
// equal the larger circle radius (20); the smaller square at the top has
// XY in [-15, 15].
//
// Build the two profiles as sketches and loft between them. The Sketch.loft
// API takes a second sketch and (optionally) section planes. We place the
// circle on Z=0 (XY plane, normal +Z) and the square on Z=40.

const circleR = 20;
const squareSide = 30;
const height = 40;

// Approximate the circle with a closed polyline (48 segments) so the loft
// has comparable vertex counts on both sections (OCCT's BRepOffsetAPI_ThruSections
// works best when profile vertex counts match closely).
const N = 48;
let circleProfile = path().moveTo(circleR, 0);
for (let i = 1; i < N; i++) {
  const a = (i / N) * 2 * Math.PI;
  circleProfile = circleProfile.lineTo(circleR * Math.cos(a), circleR * Math.sin(a));
}
const circleSketch = circleProfile.close();

// Square profile, also approximated with N points around the perimeter so
// loft section vertex counts match. Square side = 30, centred at origin.
const half = squareSide / 2;
const perim = 4 * squareSide;
// Compute the starting point (i=0) explicitly to avoid a null accumulator.
let squareProfile = path().moveTo(-half, -half);
for (let i = 1; i < N; i++) {
  const s = (i / N) * perim;
  // Walk around the square perimeter
  let x: number, y: number;
  if (s < squareSide) {
    // Side 1: from (-half, -half) to (half, -half)
    x = -half + s;
    y = -half;
  } else if (s < 2 * squareSide) {
    // Side 2: (half, -half) to (half, half)
    x = half;
    y = -half + (s - squareSide);
  } else if (s < 3 * squareSide) {
    // Side 3: (half, half) to (-half, half)
    x = half - (s - 2 * squareSide);
    y = half;
  } else {
    // Side 4: (-half, half) to (-half, -half)
    x = -half;
    y = half - (s - 3 * squareSide);
  }
  squareProfile = squareProfile.lineTo(x, y);
}
const squareSketch = squareProfile.close();

// Loft from circle (z=0, normal +Z) to square (z=40, normal +Z). The default
// loft places sections at z=0 and z=spacing; pass spacing=40.
return circleSketch.loft(squareSketch, { spacing: height });
