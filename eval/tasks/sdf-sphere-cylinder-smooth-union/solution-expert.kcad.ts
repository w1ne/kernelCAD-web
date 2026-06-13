// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const s = sdf.sphere(10);
const c = sdf.cylinder(4, 24);
return sdf.materialize(sdf.smoothBlend(s, c, 3), { resolution: 20 });
