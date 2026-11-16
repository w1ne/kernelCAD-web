// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Tapered fillet: an L-bracket whose inside root round grows from 2 mm at
// the front (y = 0) to 8 mm at the back (y = 30), adding more material
// where the bracket is to carry more bending.

const bracket = box(60, 30, 5).union(box(5, 30, 40));
const insideRoot = { parallel: 'Y', within: { xMin: 4, xMax: 6, zMin: 4, zMax: 6 } };
return bracket.fillet(2, insideRoot, { endRadius: 8 });
