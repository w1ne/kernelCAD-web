// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
return box(100, 100, 10)
  .hole('top', { u: -30, v:   0, diameter: 6, depth: 'through', counterbore: { diameter: 11, depth: 4 } })
  .hole('top', { u:  30, v:   0, diameter: 6, depth: 'through', counterbore: { diameter: 11, depth: 4 } })
  .hole('top', { u:   0, v: -30, diameter: 4, depth: 'through', countersink: { diameter: 8 } })
  .hole('top', { u:   0, v:  30, diameter: 4, depth: 'through', countersink: { diameter: 8 } });
