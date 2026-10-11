// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/30: 3 mm steel tab — 60 × 20 blank, −90° (down) bend at x = 20, R3, K 0.42.
const blank = path().moveTo(0, 0).lineTo(60, 0).lineTo(60, 20).lineTo(0, 20).close();

// Positive angles fold towards +normal (+Z); a downward flange is negative.
return sheetMetal(blank, { thickness: 3, kFactor: 0.42 }).bend({ atX: 20 }, -90, 3);
