// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Symmetric revolve: a 90° pipe elbow, Ø16 mm outside and Ø12 mm bore, on a
// 30 mm bend radius. The bend is centred on its sketch plane (y = 0), so the
// two end faces sit at ±45° and the elbow mirrors about the XZ plane. The bore
// revolves 2° further each way, so it cuts clean through both end faces.

const outer = path().circle(30, 0, 8).revolve({ angleDeg: 90, symmetric: true });
const bore = path().circle(30, 0, 6).revolve({ angleDeg: 94, symmetric: true });
return outer.subtract(bore);
