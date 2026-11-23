// Minimal regression fixture for issue #917's Gate 3 solved-frame follow-up.
// The rotor's authored `at` is intentionally far away; the revolute mate
// places its local [10, 0, 0] connector at the base origin at a 90° pose.
const arm = assembly('gate3-solved-frame');

arm
  .part('base', box(24, 16, 8, true).color('#687b90'))
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  });

arm
  .part('rotor', box(20, 8, 4, true).color('#f29b4b'), { at: [100, 0, 0] })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [10, 0, 0] },
    axis: [0, 0, 1],
  });

arm.mate('hinge', 'base.axis', 'rotor.axis', 'revolute', {
  pose: 90,
  limitsDeg: [0, 90],
  maxLoad: { torque: 5 },
});

return arm.solvedModel({});
