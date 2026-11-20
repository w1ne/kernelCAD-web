// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Type fixture: every face-wrapper edge selector form that the runtime
// accepts, each on its own plate so no two edge features share an edge.
const plate = (x: number) => box(40, 30, 6).translate(x, 0, 0);
return [
  plate(0).fillet(1, { face: 'top' }),
  plate(50).chamfer(0.5, { face: { atZ: 0 } }),
  plate(100).fillet(0.5, { face: { byNormal: 'X', minArea: 100 } }),
  plate(150).chamfer(0.5, { face: kc.q.face(kc.q.closestTo([170, 0, 3])) }),
];
