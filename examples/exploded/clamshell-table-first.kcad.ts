// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression example: the table is declared before the base/lid hinge, so it is
// the first part of the mate graph. Mate-axis explode must still use the
// base/lid hinge connector. The base sits on the table (fastened, face
// contact at z = 0) and the hinge opens from the closed pose (lid flat on the
// base) to 135 degrees, so evaluate_script reports a real mechanism.
//
// Render the assembled and exploded views:
//   npx tsx src/agent/cli/index.ts render examples/exploded/clamshell-table-first.kcad.ts \
//     --pose 35,25 --explode 1 --explode-mode mate-axis \
//     --out examples/exploded/clamshell-table-first.png --no-watermark \
//     --no-mechanism-check

const arm = assembly('clamshell-table-first');

// The table is intentionally the first declaration.
const table = arm.part('table', box(400, 300, 5, true).translate(0, 0, -2.5), {
  material: 'aluminum',
});

const base = arm.part('base', box(300, 200, 12, true).translate(0, 0, 6), { material: 'aluminum' });
const lid = arm.part('lid', box(300, 200, 6, true).translate(0, 100, 3), { material: 'abs' });

table.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
base.connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('baseOnTable', 'table.top', 'base.bottom', 'fastened');

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
arm.mate('hinge', 'base.hingeAxis', 'lid.hingeAxis', 'revolute', { limitsDeg: [0, 135] });

return arm.model();
