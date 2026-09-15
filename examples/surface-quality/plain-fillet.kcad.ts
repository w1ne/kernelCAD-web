// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Plain G1 fillet on a box. Pair with g2-blend.kcad.ts and run.ts —
// inspect({ of: 'continuity' }) reports G1, not G2, on fillet-to-face edges.

return box(20, 20, 20).fillet(3);
