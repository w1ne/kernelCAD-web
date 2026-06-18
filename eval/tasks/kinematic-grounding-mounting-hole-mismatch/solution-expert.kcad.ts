// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gate 1 demonstration — fastened mate between two parts whose mounting
// holes have mismatching diameters (Ø5 on side A, Ø6 on side B). The
// expert calls solvedModel under 'warn' mode so the diagnostic appears
// on scene.warnings instead of throwing; an in-script assertion then
// flips the script into a thrown error if the diagnostic is absent.
//
// Mirrors src/lib/mates/mountingHoleConsistency.test.ts §"emits
// assembly.mounting-hole.mismatch for diameter mismatch".

const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });

const arm = assembly('mounting-hole-mismatch-demo');

arm
  .part('a', a)
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
arm
  .part('b', b, { at: [0, 0, 5] })
  .connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
arm.mate('screw', 'a.h', 'b.h', 'fastened');

const scene = await arm.solvedModel({}, { validate: 'warn' });

const fired = scene.warnings.some((d) => d.code === 'assembly.mounting-hole.mismatch');
if (!fired) {
  throw new Error(
    'Gate 1 demonstration failed: expected diagnostic code ' +
      "'assembly.mounting-hole.mismatch' was not present in scene.warnings. " +
      `Observed codes: ${scene.warnings.map((d) => d.code).join(', ') || '(none)'}`,
  );
}

return scene;
