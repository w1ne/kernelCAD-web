// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A 40 x 40 x 10 plate with a Ø10 through bore. A positive offset grows the
// solid along the bore wall's outward normal, so the wall moves toward the
// axis and the bore narrows to Ø8.
const grow = param('boreGrow', 1, { min: -4, max: 4 });

let plate = box(40, 40, 10);
plate = plate.subtract(cylinder(10, 5).translate(20, 20, 0));
return plate.offsetFaces({ ofSurfaceType: 'CYLINDER' }, grow);
