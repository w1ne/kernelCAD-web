// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/engraved-nameplate/solution-expert.kcad.ts
const base = box(80, 30, 3);
const label = sketch
  .text("KERNEL", { size: 12, align: 'center', position: [40, 15] })
  .extrude(1.5);
return base.subtract(label.translate(0, 0, 1.5));
