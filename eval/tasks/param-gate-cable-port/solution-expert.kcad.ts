// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const addCablePort = param('addCablePort', true, {
  description: 'include the optional cable pass-through',
});

const cablePort = path()
  .moveTo(-8, -5)
  .lineTo(8, -5)
  .lineTo(8, 5)
  .lineTo(-8, 5)
  .close();

return box(80, 50, 6)
  .cutout(cablePort, {
    face: 'top',
    depth: 'through',
    name: 'cablePort',
    enabled: addCablePort,
  })
  .fillet(0.5, { face: 'cablePort.wall' });
