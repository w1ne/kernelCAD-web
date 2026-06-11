// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const base = box(100, 100, 3);
const fin = box(3, 25, 12).translate(0, 0, 3);
const fins = fin.patternGrid({
  x: { count: 8, direction: [1, 0, 0], spacing: 12 },
  y: { count: 3, direction: [0, 1, 0], spacing: 30 },
});
return base.union(fins);
