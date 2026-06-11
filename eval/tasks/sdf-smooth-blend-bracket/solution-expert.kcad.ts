// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const plate = sdf.box([30, 20, 4]);
const pin   = sdf.cylinder(5, 16);
const field = sdf.smoothBlend(plate, pin, 2);
return sdf.materialize(field, { resolution: 25 });
