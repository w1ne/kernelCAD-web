// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/15: 80 × 50 × 30 rounded box, shelled to 2 mm, open top.
const wall = param('wall', 2, { min: 1.2, max: 4 });

// Rounded outline extrusion; shell removes the top face (picked by normal —
// an extruded outline has no canonical face names).
return extrudeRoundedRect(80, 50, 6, 30).shell(wall, { face: { byNormal: 'Z' } });
