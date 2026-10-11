// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/29: 2 mm steel L-bracket — 100 × 60 blank, 90° bend at x = 50, R3, K 0.38.
const blank = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();

return sheetMetal(blank, { thickness: 2, kFactor: 0.38 }).bend({ atX: 50 }, 90, 3);
