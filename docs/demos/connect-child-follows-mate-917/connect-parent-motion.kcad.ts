// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

const arm = assembly('rig');

const root = arm.part('root', box(2, 2, 2, true));
root.connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

const parent = arm.part('parent', box(20, 4, 2, false), {
  at: [100, 0, 0],
  connectors: { childMount: { origin: [20, 0, 0] } },
});
parent.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: [-100, 0, 0] },
  axis: [0, 0, 1],
});

arm.part('child', box(10, 2, 2, false), {
  connectors: { root: { origin: [0, 0, 0] } },
  connect: { connector: 'root', to: parent.connector('childMount') },
});

arm.mate('turn', 'root.axis', 'parent.hinge', 'revolute', { pose: 90 });
return arm.solvedModel({}, { validate: 'off' });
