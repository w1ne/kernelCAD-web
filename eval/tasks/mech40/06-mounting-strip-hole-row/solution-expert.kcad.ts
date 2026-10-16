// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/06: 200 × 20 × 3 strip, 9 × Ø4.5 holes at 22 mm pitch, centred.
const n = 9;
const pitch = 22;
const positions = Array.from({ length: n }, (_, k) => ({ u: (k - (n - 1) / 2) * pitch, v: 0 }));

return box(200, 20, 3).holes('top', { positions, diameter: 4.5, depth: 'through' });
