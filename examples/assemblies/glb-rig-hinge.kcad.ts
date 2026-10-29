// Original kernelCAD hinge assembly used to demonstrate GLB rig export.
// The static boxes are intentional simple blockout geometry; no external mesh
// is used. The lid is positioned from its named connector and revolute mate.

const arm = assembly('GLB rig hinge example');

const base = arm.part('base', box(60, 40, 8));
const lid = arm.part('lid', box(60, 30, 4));

base.connector('hinge-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 20, 4] },
  axis: [1, 0, 0],
});
lid.connector('hinge-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, -15, -2] },
  axis: [1, 0, 0],
});

arm.mate(
  'lid',
  'base.hinge-axis',
  'lid.hinge-axis',
  'revolute',
  { pose: 35, limitsDeg: [0, 110] },
);

return arm.model();
