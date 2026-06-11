// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gate 2 demonstration — revolute mate whose axis line floats 50 mm above
// both bodies. Gate 2 emits `assembly.joint-axis.unbound` (error) on
// each unbound side. Under `validate: 'warn'` the diagnostic appears on
// scene.warnings; the in-script assertion flips the script into a
// thrown error if the diagnostic is absent.
//
// Mirrors src/lib/mates/jointAxisBinding.test.ts §"emits
// assembly.joint-axis.unbound for both sides when the axis floats
// 50 mm offset from each body".

const arm = assembly('joint-axis-floating-demo');

arm
  .part('a', box(10, 10, 10), { at: [0, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [5, 5, 50] },
    axis: [1, 0, 0],
  });
arm
  .part('b', box(10, 10, 10), { at: [10, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [-5, 5, 50] },
    axis: [1, 0, 0],
  });
arm.mate('hinge', 'a.c', 'b.c', 'revolute', { limitsDeg: [-10, 10] });

const scene = await arm.solvedModel({}, { validate: 'warn' });

const fired = scene.warnings.some((d) => d.code === 'assembly.joint-axis.unbound');
if (!fired) {
  throw new Error(
    'Gate 2 demonstration failed: expected diagnostic code ' +
      "'assembly.joint-axis.unbound' was not present in scene.warnings. " +
      `Observed codes: ${scene.warnings.map((d) => d.code).join(', ') || '(none)'}`,
  );
}

return scene;
