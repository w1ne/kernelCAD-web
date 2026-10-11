// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/33: 50 × 30 × 4 plate, 3 × M4 countersunk (Ø4.5 through, 90° to Ø9).
return box(50, 30, 4).holes('top', {
  positions: [{ u: -15, v: 0 }, { u: 0, v: 0 }, { u: 15, v: 0 }],
  diameter: 4.5,
  depth: 'through',
  countersink: { diameter: 9, angleDeg: 90 },
});
