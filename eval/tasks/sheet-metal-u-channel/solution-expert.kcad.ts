// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const s = path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 80).lineTo(0, 80).close();
const blank = sheetMetal(s, { thickness: 2, kFactor: 0.40 });
const one = blank.bend({ atX: 20 }, 90, 2.5);
return one.bend({ atX: 100 }, 90, 2.5);
