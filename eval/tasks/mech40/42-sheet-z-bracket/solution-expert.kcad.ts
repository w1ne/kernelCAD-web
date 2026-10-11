// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/42: 2 mm steel Z-bracket — 100 × 40 blank, +90° at x = 40, −90° at x = 60, R2, K 0.4.
const blank = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 40).lineTo(0, 40).close();

// The shorter side of each bend line folds: the 40 mm leg left of x = 40
// goes up, the 40 mm leg right of x = 60 goes down; the web stays flat.
return sheetMetal(blank, { thickness: 2, kFactor: 0.4 })
  .bend({ atX: 40 }, 90, 2)
  .bend({ atX: 60 }, -90, 2);
