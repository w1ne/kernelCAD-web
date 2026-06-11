// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
return box(50, 30, 10, false, { faceLabels: { rim: 'top' } })
  .fillet(3, { face: 'rim' });
