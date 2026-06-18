// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MUSE 'vase_teardrop' — teardrop vase with a high shoulder and small top
// opening. Single hollow solid produced by ONE revolve of an annular wall
// profile (outer boundary up, inner boundary back down), leaving a 2.5 mm
// wall, a 2.5 mm flat base floor, and a small open mouth — no boolean, so
// the shell stays one clean closed solid.
//
// The teardrop silhouette is sampled into `STEPS` polyline stations from a
// smooth cosine-blended radius function (the spec's `steps` parameter is
// exactly this vertical lofting resolution).

const HEIGHT = 220;     // overall height
const WALL = 2.5;       // wall_thickness
const STEPS = 24;       // vertical resolution (spec default 16, range 10..26)
const R_MAX = 48;       // profile_radius — max bulge
const R_BASE = 26;      // foot radius
const R_MOUTH = 12;     // small top opening radius
const SHOULDER = 0.68;  // high shoulder at ~68% of the height

// Smooth radius profile: cosine ease from the foot up to the shoulder bulge,
// then a faster cosine taper from the shoulder into the narrow mouth.
function radiusAt(t: number): number {
  if (t <= SHOULDER) {
    const u = t / SHOULDER;
    return R_BASE + (R_MAX - R_BASE) * Math.sin((Math.PI / 2) * u) ** 1.2;
  }
  const u = (t - SHOULDER) / (1 - SHOULDER);
  return R_MOUTH + (R_MAX - R_MOUTH) * Math.cos((Math.PI / 2) * u) ** 1.4;
}

// Outer skin stations, base -> rim.
const stations: [number, number][] = [];
for (let i = 0; i <= STEPS; i++) {
  const t = i / STEPS;
  stations.push([radiusAt(t), t * HEIGHT]);
}

// Annular wall profile in (radial-X, axial-Z):
// axis floor -> foot -> outer skin up -> rim -> inner skin down -> cavity
// floor at z = WALL -> axis -> close.
let p = path().moveTo(0, 0).lineTo(stations[0][0], 0);
for (let i = 1; i <= STEPS; i++) p = p.lineTo(stations[i][0], stations[i][1]);
// Flat rim of the small mouth.
p = p.lineTo(R_MOUTH - WALL, HEIGHT);
// Inner skin: radial inward offset of the outer skin, descending.
for (let i = STEPS - 1; i >= 1; i--) {
  const [r, z] = stations[i];
  p = p.lineTo(Math.max(r - WALL, 1), Math.max(z, WALL));
}
// Cavity floor and back to the axis.
p = p.lineTo(Math.max(stations[0][0] - WALL, 1), WALL).lineTo(0, WALL);

return p.close().revolve().color('plate');
