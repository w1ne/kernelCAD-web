// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Tapered extrude: a 60 × 40 × 4 mm moulded mounting plate with two Ø8 mm
// screw bosses, 10 mm tall, drafted 3° for mould release. Each boss has a
// Ø2.5 mm, 9 mm deep pilot hole for an M3 thread-forming screw.

const plate = box(60, 40, 4);
const boss = path().moveTo(4, 0).threePointsArc(-4, 0, 0, 4).threePointsArc(4, 0, 0, -4).close()
  .extrude(10, { taperDeg: 3 });
const pilot = cylinder(9, 1.25);
return plate
  .union(boss.translate(15, 20, 4))
  .union(boss.translate(45, 20, 4))
  .subtract(pilot.translate(15, 20, 5))
  .subtract(pilot.translate(45, 20, 5));
