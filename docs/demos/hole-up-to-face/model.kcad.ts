// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A bore in the tall section ends on the plane of the lower ledge.

const body = box(40, 20, 20).subtract(box(20, 20, 10).translate(20, 0, 10));
const bored = body.hole('top', {
  u: 0,
  v: 0,
  diameter: 4,
  upToFace: { containsPoint: [30, 10, 10] },
  name: 'ledge-bore',
});

return bored;
