// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Cut up to a face: a 60 x 30 x 24 mm stepped fixture block with a datum
// ledge at z = 12 on its right half. A 10 x 20 mm locating slot on the high
// side is cut down to the ledge plane with upToFace, so the slot floor stays
// coplanar with the ledge when the ledge height changes. No depth number is
// copied from the step.

const block = box(60, 30, 24).subtract(box(30, 30, 12).translate(30, 0, 12));
const slot = path().moveTo(-5, -10).lineTo(5, -10).lineTo(5, 10).lineTo(-5, 10).close();
return block.cutout(slot, {
  face: { containsPoint: [15, 15, 24] },
  upToFace: { containsPoint: [45, 15, 12] },
});
