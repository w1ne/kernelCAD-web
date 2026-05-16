// Repair-loop broken half — Gate 1 mounting-hole mismatch (Ø5 vs Ø6).
// Mirrors kinematic-grounding-mounting-hole-mismatch's expert solution.
// Pairs with kinematic-grounding-repair-loop-fixed which repairs to
// Ø5 on both sides.

const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });

const arm = assembly('repair-loop-broken');

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
