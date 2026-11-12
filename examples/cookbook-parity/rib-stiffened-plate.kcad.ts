// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A simple supported plate with an upright centerline rib. The rib starts
// 0.1 mm inside the plate so the union has real overlap instead of coincident
// faces. The centerline and dimensions are in millimetres.

const plate = box(40, 30, 10);
return rib(plate, [[5, 15], [35, 15]], {
  thickness: 2,
  height: 20,
  startZ: 9.9,
});
