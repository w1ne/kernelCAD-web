// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/18: Ø60 × 80 container, shelled to 2 mm, open top.
const od = param('diameter', 60, { min: 20, max: 200 });
const h = param('height', 80, { min: 20, max: 300 });
const wall = 2;

return cylinder(h, od.divide(2)).shell(wall, { face: 'top' });
