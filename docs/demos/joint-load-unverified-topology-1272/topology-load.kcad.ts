// A legacy manual-load check with one topology-bound mate connector.
const arm = assembly('topology-load-check');

const housing = box(20, 20, 5).hole('top', {
  u: 0,
  v: 0,
  diameter: 5,
  depth: 'through',
});

arm.part('housing', housing, { at: [50, 0, 0] }).connector('bore-axis', {
  type: 'axis',
  origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  axis: [0, 0, 1],
});

arm.part('link', box(10, 10, 10)).connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

arm.mate('hinge', 'housing.bore-axis', 'link.axis', 'revolute', {
  maxLoad: { torque: 10 },
});

return arm.solvedModel({});
