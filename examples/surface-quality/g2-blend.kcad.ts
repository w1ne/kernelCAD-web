// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// G2 blend: split a C2 NURBS bump and sew the halves. The shared split
// edge classifies G2 (normals and curvature match). Pair with
// plain-fillet.kcad.ts and run.ts.

const bump = nurbsSurface({
  controls: [
    [[0, 0, 0], [20, 0, 4], [40, 0, 0]],
    [[0, 20, 4], [20, 20, 10], [40, 20, 4]],
    [[0, 40, 0], [20, 40, 4], [40, 40, 0]],
  ],
  degree: { u: 2, v: 2 },
});
const cutter = nurbsSurface({
  controls: [[[20, -5, -10], [20, 45, -10]], [[20, -5, 20], [20, 45, 20]]],
  degree: { u: 1, v: 1 },
});
return sew(bump.split(cutter));
