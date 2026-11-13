// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression example: a standalone table is declared before a mated hinge
// assembly. Mate-axis explode must still use the base/lid hinge connector.
//
// Render the assembled and exploded views:
//   npx tsx src/agent/cli/index.ts render examples/exploded/clamshell-table-first.kcad.ts \
//     --pose 35,25 --explode 1 --explode-mode mate-axis \
//     --out examples/exploded/clamshell-table-first.png --no-watermark \
//     --no-mechanism-check

const arm = assembly('clamshell-table-first');

// This unconnected context part is intentionally the first declaration.
arm.part('table', box(400, 300, 5, true).translate(0, 0, -10), { material: 'aluminum' });

const base = arm.part('base', box(300, 200, 12, true).translate(0, 0, 6), { material: 'aluminum' });
const lid = arm.part('lid', box(300, 200, 6, true).translate(0, 100, 3), { material: 'abs' });

base.connector('hingeAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, -100, 12] },
  axis: [1, 0, 0],
});
lid.connector('hingeAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [1, 0, 0],
});
arm.mate('hinge', 'base.hingeAxis', 'lid.hingeAxis', 'revolute', { limitsDeg: [-15, 135] });

return arm.model();
