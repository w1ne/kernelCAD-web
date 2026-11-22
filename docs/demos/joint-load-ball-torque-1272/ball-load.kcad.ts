// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reproducer for ball-mate torque being skipped by the legacy load checker.

const arm = assembly('ball-load-torque-check');

arm
  .part('housing', box(10, 10, 10), { at: [100, 0, 0] })
  .connector('pivot', {
    type: 'ball',
    origin: { kind: 'vec3', value: [-100, 0, 0] },
  });

arm
  .part('link', box(10, 10, 10))
  .connector('pivot', {
    type: 'ball',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

arm.mate('socket', 'housing.pivot', 'link.pivot', 'ball');

return arm.model();
