// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/export-dxf-planar-bracket/solution-expert.kcad.ts
//
// Slice A DXF entry: build a 50 x 25 mm sheet-metal blank with a single
// 90-degree fold. The harness exports the returned bent body to DXF; the
// runtime walks the lineage to the sheetMetal root and emits the flat-
// pattern polylines on the locked `cut` / `BEND` layers.

const s = path()
  .moveTo(0, 0)
  .lineTo(50, 0)
  .lineTo(50, 25)
  .lineTo(0, 25)
  .close();

const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.4 });
return blank.bend({ atX: 25 }, 90, 1);
