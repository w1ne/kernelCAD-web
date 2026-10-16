// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/41: 2 mm aluminium U-channel — 100 × 60 blank, +90° bends at x = 25 and x = 75, R2, K 0.4.
const blank = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();

// Bend lines are blank coordinates; the shorter side of each line folds, so
// the 50 mm web between them stays on the bench.
return sheetMetal(blank, { thickness: 2, kFactor: 0.4 })
  .bend({ atX: 25 }, 90, 2)
  .bend({ atX: 75 }, 90, 2);
