// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/31: 2 mm steel 45° bracket — 80 × 30 blank, +45° bend at x = 40, R2, K 0.4.
const blank = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 30).lineTo(0, 30).close();

return sheetMetal(blank, { thickness: 2, kFactor: 0.4 }).bend({ atX: 40 }, 45, 2);
