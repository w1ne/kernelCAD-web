// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// General edge-break validation fixture: 20 x 30 x 10 mm block, all edges R2.
// verify({ check: 'edge-radius', file: 'examples/edge-radius/rounded-block.kcad.ts', min_radius_mm: 1 }) passes.
// Change minimum to 3 for measured-radius failures; replace the return with
// box(20,30,10) and require_edge_break:'external' for twelve sharp-edge failures.
return box(20, 30, 10).fillet(2);
