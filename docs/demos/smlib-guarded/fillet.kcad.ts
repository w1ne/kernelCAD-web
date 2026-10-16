// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Intent: exercise the guarded native constant-radius G1 fillet, radius 0.5 mm.
return extrudePolygon([[0,0],[10,0],[10,10],[0,10]], 5).fillet(0.5);
