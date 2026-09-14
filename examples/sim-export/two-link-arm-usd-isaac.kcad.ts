// USD Isaac export smoke. A two-link revolute arm exported to an ASCII USD
// (.usda) stage using the UsdPhysics schema, for Isaac Sim / Isaac Lab
// articulation import.
//
// Run with:
//   npx tsx src/agent/cli/index.ts export usd-isaac \
//     examples/sim-export/two-link-arm-usd-isaac.kcad.ts \
//     -o /tmp/two-link-arm.usda
//
// Expected output: /tmp/two-link-arm.usda + /tmp/meshes/base.stl,
// /tmp/meshes/link1.stl. The .usda contains a
// PhysicsArticulationRootAPI root Xform, two rigid-body link prims (each
// with physics:mass / physics:centerOfMass / physics:diagonalInertia), and
// one PhysicsRevoluteJoint with physics:axis = (0, 0, 1) and
// physics:lowerLimit/upperLimit = -90/90.

const arm = assembly('two-link-usd-arm');

const base = arm.part('base', box(40, 40, 20, true).translate(0, 0, 10), { material: 'steel' });
const link1 = arm.part('link1', box(20, 20, 100, true).translate(0, 0, 50), { material: 'aluminum' });

base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 20] },
  axis: [0, 0, 1],
});
link1.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', {
  limitsDeg: [-90, 90],
});

return arm.model();
