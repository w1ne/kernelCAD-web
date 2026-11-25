// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Named parting-plane draft fixture. The front face tapers 10 degrees about
// the named top plane, so the top edge stays at y = 0 and the bottom edge
// swings outward.
const body = box(40, 30, 20);
return body.draft(10, { face: 'front', neutralPlane: 'top' });
