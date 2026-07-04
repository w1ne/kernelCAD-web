// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Slice E proving ground — the WATERTIGHT HEADLINE in isolation.
//
// Six planar NURBS patches enclose the box [0,W]×[0,D]×[0,H]. The front wall is
// authored OVERSIZED (it overhangs below z=0) and TRIMMED back to the z=0 plane
// with `trimTo` (E2). All six patches share geometrically identical boundary
// edges, so `sew([...], { requireClosed: true })` (E3) stitches them into a
// genuinely CLOSED SOLID — the watertight win the whole slice is built to prove.
//
// Trim is used where it earns its place: the front wall is over-built and trimmed
// to the parting plane, exercising E2→E3 composition rather than hand-placing a
// pre-sized patch. Trim runs on planar patches only (the curved-patch guard
// refuses anything else), so every patch here is degree-1 (flat).
const W = 40; // width  (X)
const D = 30; // depth  (Y)
const H = 20; // height (Z)

// A flat quad patch from four corner points, CCW: p00 → p10 → p11 → p01.
// degree-1 in both directions ⇒ a single planar face that `sew` accepts.
function quad(p00, p10, p11, p01) {
  return nurbsSurface({
    controls: [
      [p00, p01],
      [p10, p11],
    ],
    degree: { u: 1, v: 1 },
  });
}

const bottom = quad([0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]);
const top = quad([0, 0, H], [W, 0, H], [W, D, H], [0, D, H]);

// Front wall, over-built below the floor, then trimmed back to z = 0.
const frontOversized = quad([0, 0, -10], [W, 0, -10], [W, 0, H], [0, 0, H]);
const partingPlane = quad([-5, 0, 0], [W + 5, 0, 0], [W + 5, D, 0], [-5, D, 0]);
const front = frontOversized.trimTo(partingPlane);

const back = quad([0, D, 0], [W, D, 0], [W, D, H], [0, D, H]);
const left = quad([0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]);
const right = quad([W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]);

return sew([bottom, top, front, back, left, right], { requireClosed: true });
