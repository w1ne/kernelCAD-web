// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// D-shape: 12-mm-wide chord at v=0 from (-6,0) to (6,0), arc via (0,8)
// back to start. Builder closes back to the moveTo point.
const dShape = path()
  .moveTo(-6, 0)
  .lineTo(6, 0)
  .threePointsArc(-6, 0, 0, 8)
  .close();

return box(50, 50, 8).cutout(dShape, { face: 'top', depth: 4 });
