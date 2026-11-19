// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gallery copy of eval/tasks/grid-heat-sink-fin-array/solution-expert.kcad.ts with an
// anodised-aluminium finish. The geometry is identical; the eval task keeps the bare solid.
const base = box(100, 100, 3);
const fin = box(3, 25, 12).translate(0, 0, 3);
const fins = fin.patternGrid({
  x: { count: 8, direction: [1, 0, 0], spacing: 12 },
  y: { count: 3, direction: [0, 1, 0], spacing: 30 },
});
return base.union(fins).finish('anodized', { color: '#3d5a80' });
