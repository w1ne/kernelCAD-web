// Jointed tendon anchor with a placed root part.
//
// The base starts at [100, 0, 0]. Its hook at local [10, 0, 0] therefore
// belongs at x=110 in the rendered scene. The legacy revolute joint keeps the
// assembly in the body-tree path covered by issue #917.

const arm = assembly('jointed-tendon-anchor');
const base = arm.part('base', box(20, 20, 10, true), { at: [100, 0, 0] });
base.connector('hook', {
  type: 'axis',
  origin: { kind: 'vec3', value: [10, 0, 0] },
  axis: [0, 0, 1],
});

const link = arm.part('link', box(20, 20, 10, true));
link.connector('eye', {
  type: 'axis',
  origin: { kind: 'vec3', value: [-10, 0, 0] },
  axis: [0, 0, 1],
});

arm.revolute('hinge', base, link, { axis: [0, 0, 1], origin: [0, 0, 0] });
arm.tendon('spring', {
  from: 'base.hook',
  to: 'link.eye',
  restLengthMm: 120,
  stiffnessNmm: 0.5,
});

return arm.solvedModel({ hinge: 0 }, { validate: 'off' });
