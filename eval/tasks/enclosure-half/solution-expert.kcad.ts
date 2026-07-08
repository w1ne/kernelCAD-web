// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Slice E proving ground — molded enclosure half.
//
// End-to-end composition of the slice's surface stack:
//   nurbsSurface (E1)  — six planar patches define the box walls.
//   trimTo       (E2)  — the over-built front wall is trimmed to the parting plane.
//   sew          (E3)  — the patches stitch into a genuinely CLOSED SOLID (watertight).
//   boss         (E1)  — an exact-radius cylindrical boss is fused onto the top.
//
// The result is a watertight, STEP-exportable solid carrying a boss whose radius
// reads back EXACTLY 5 mm. See task-10-report.md for the draft-on-spline-faces
// gap this proving ground surfaced (the slice's draft op refuses B-spline faces,
// so the moldability taper could not be applied to the sewn body).
const W = 40; // width  (X)
const D = 30; // depth  (Y)
const H = 20; // height (Z)
const BOSS_R = 5; // exact boss radius (E1 exactness target)
const BOSS_H = 14; // boss column height; penetrates the top face to fuse cleanly

// A flat quad patch from four corner points, CCW: p00 → p10 → p11 → p01.
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

// Front wall over-built below the floor, then trimmed back to z = 0 (E2 → E3).
const frontOversized = quad([0, 0, -10], [W, 0, -10], [W, 0, H], [0, 0, H]);
const partingPlane = quad([-5, 0, 0], [W + 5, 0, 0], [W + 5, D, 0], [-5, D, 0]);
const front = frontOversized.trimTo(partingPlane);

const back = quad([0, D, 0], [W, D, 0], [W, D, H], [0, D, H]);
const left = quad([0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]);
const right = quad([W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]);

// Watertight closed solid from the sewn patches (E3).
const shell = sew([bottom, top, front, back, left, right], { requireClosed: true });

// Cylindrical mounting boss, exact radius (E1). Built as an analytic extruded
// circle so its radius is exact; it penetrates the top face (starts 2 mm below
// z = H) so the union fuses into a single watertight region.
const boss = extrudeCircle(BOSS_R, BOSS_H).translate(W / 2, D / 2, H - 2);

return union(shell, boss);
