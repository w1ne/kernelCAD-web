// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/export-3mf-multipart/solution-expert.kcad.ts
//
// Slice A 3MF multi-body entry: a three-part fastener assembly with
// distinct per-part colors. The runtime walks the returned Scene through
// `sceneToWorldFrameParts` and ships one `<object>` per part with its
// `displaycolor` matched to the role token.

const a = assembly('fastener-trio');

a.part('plate', box(60, 40, 4).color('#888888'), {
  at: [0, 0, 0],
});

a.part('bracket', box(20, 20, 12).color('#cc4444'), {
  at: [20, 10, 4],
});

a.part('cap', cylinder(4, 5).color('#4488cc'), {
  at: [30, 20, 16],
});

return a.model();
