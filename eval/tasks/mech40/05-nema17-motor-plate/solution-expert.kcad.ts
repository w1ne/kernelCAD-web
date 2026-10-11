// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/05: NEMA 17 plate — Ø22.5 pilot, 4 × M3 on 31 mm square, 4 × M5 corners.
const size = 60;
const t = 5;
const motorPitch = 31 / 2;
const cornerOffset = size / 2 - 6;
const square = (d: number) => [{ u: -d, v: -d }, { u: d, v: -d }, { u: -d, v: d }, { u: d, v: d }];

return box(size, size, t)
  .hole('top', { u: 0, v: 0, diameter: 22.5, depth: 'through', name: 'pilot' })
  .holes('top', { positions: square(motorPitch), diameter: 3.4, depth: 'through', name: 'motorScrews' })
  .holes('top', { positions: square(cornerOffset), diameter: 5.5, depth: 'through', name: 'mount' });
