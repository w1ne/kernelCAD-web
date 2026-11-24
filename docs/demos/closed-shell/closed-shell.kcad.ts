// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Demo: a 60 x 40 x 30 mm block hollowed to a sealed 3 mm wall with
// `shell(3, { closed: true })`, then cut in half at y = 20 so the enclosed
// cavity and the wall section are visible in the render. All dimensions are
// millimetres.
const outer = box(60, 40, 30);
const hollow = outer.shell(3, { closed: true });
// Keep the y < 20 half; the cut plane passes through the sealed cavity.
const cutaway = box(70, 20, 40).translate(-5, 20, -5);
return hollow.subtract(cutaway).finish('aluminum-6061');
