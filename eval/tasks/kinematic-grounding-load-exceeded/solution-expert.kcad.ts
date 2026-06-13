// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gate 3 demonstration — revolute mate with declared maxLoad.torque = 5
// N·m and externalLoads producing 10 N·m (200 N at a 50 mm lever arm).
// Gate 3 emits `assembly.joint.load-exceeded` (error). Under
// `validate: 'warn'` the diagnostic appears on scene.warnings; the
// in-script assertion flips the script into a thrown error if the
// diagnostic is absent.
//
// v0.7.5 has no public `arm.mate(..., { maxLoad })` opt yet — the spec
// notes Gate 3 is wired but the agent surface lands later. Use the
// `__mates()` accessor + cast to patch maxLoad onto the just-pushed
// mate record. This mirrors how
// src/lib/mates/jointLoadCapacity.test.ts authors load-exceeded
// fixtures (`setMaxLoad` helper).

const arm = assembly('load-exceeded-demo');

arm
  .part('a', box(10, 10, 10), { at: [50, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [-50, 0, 0] },
    axis: [0, 0, 1],
  });
arm
  .part('b', box(10, 10, 10), { at: [0, 0, 0] })
  .connector('c', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  });
arm.mate('hinge', 'a.c', 'b.c', 'revolute', { limitsDeg: [-10, 10] });

// Patch maxLoad directly on the mate record — v0.7.5 has no public opt.
const mates = (arm as unknown as { __mates(): Array<{ name: string; maxLoad?: { torque?: number; force?: number } }> }).__mates();
const hinge = mates.find((m) => m.name === 'hinge');
if (!hinge) throw new Error('expert solution bug: mate "hinge" not found on arm.__mates()');
hinge.maxLoad = { torque: 5 };

const scene = await arm.solvedModel({}, {
  validate: 'warn',
  externalLoads: { a: { force: [0, 0, -200] } },
});

const fired = scene.warnings.some((d) => d.code === 'assembly.joint.load-exceeded');
if (!fired) {
  throw new Error(
    'Gate 3 demonstration failed: expected diagnostic code ' +
      "'assembly.joint.load-exceeded' was not present in scene.warnings. " +
      `Observed codes: ${scene.warnings.map((d) => d.code).join(', ') || '(none)'}`,
  );
}

return scene;
