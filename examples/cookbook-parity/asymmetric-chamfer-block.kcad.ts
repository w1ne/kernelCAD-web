// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Two-distance chamfer: a lead-in bevel 2 mm wide on the top face and
// 5 mm deep down the side faces.

const block = box(40, 30, 10);
return block.chamfer(2, 'top', { distance2: 5 });
