// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const s0 = path().moveTo(-30, -10).lineTo(30, -10).lineTo(30, 10).lineTo(-30, 10).close();
const s1 = path().moveTo(-30, -15).lineTo(30, -15).lineTo(30, 15).lineTo(-30, 15).close();
const s2 = path().moveTo(-30, -5).lineTo(30, -5).lineTo(30, 5).lineTo(-30, 5).close();
return surfaceFromCurves([s0, s1, s2]).thicken(2);
