// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Four bolt bosses on a 25 mm bolt circle about the flange centre (45, 35).
// The source boss is authored once at (70, 35); the circular pattern turns it
// about the Z axis through the pivot, so every copy stays on the flange.
const flange = box(90, 70, 10);
const boss = cylinder(8, 6).translate(70, 35, 10);
const bosses = boss.patternCircular({ count: 4, axis: 'Z', pivot: [45, 35, 0] });
return flange.union(bosses);
