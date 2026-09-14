// usd-isaac export example — a two-link revolute arm written as a UsdPhysics
// stage a GPU physics simulator can import directly.
//
// The parts carry named materials, and that one declaration does two jobs in
// the stage: steel / aluminum densities drive each link's mass and principal
// inertia, and their default finishes become the links' UsdPreviewSurface
// materials. The shoulder mate becomes a PhysicsRevoluteJoint with a Z axis
// token and +/-90 degree limits; the mate solve places link1 20 mm up, where
// its connector lands, instead of stacking it on the base.
//
// Run with:
//   mkdir -p /tmp/kc-usd && npx tsx src/agent/cli/index.ts export usd-isaac \
//     examples/sim-export/two-link-arm-usd-isaac.kcad.ts -o /tmp/kc-usd/two-link-arm.usda
//
// Expected stdout:
//   Wrote 4442 bytes to /tmp/kc-usd/two-link-arm.usda
//   wrote mesh /tmp/kc-usd/meshes/base.usda
//   wrote mesh /tmp/kc-usd/meshes/link1.usda
//
// Expected stage (inspect /tmp/kc-usd/two-link-arm.usda):
//   /two_link_usd_arm                 PhysicsArticulationRootAPI
//   /two_link_usd_arm/Links/base      physics:mass = 0.251200   (7850 kg/m^3 * 40x40x20 mm)
//   /two_link_usd_arm/Links/link1     physics:mass = 0.108000   (2700 kg/m^3 * 20x20x100 mm)
//                                     xformOp:translate = (0, 0, 0.02)
//   /two_link_usd_arm/Joints/shoulder PhysicsRevoluteJoint, physics:axis = "Z",
//                                     lowerLimit -90, upperLimit 90, no drive
//   /two_link_usd_arm/Materials/*     UsdPreviewSurface, metallic 1
//
// Add actuator gains through the export options, never through invented
// defaults: options: { format: 'usd-isaac', drives: { shoulder: { stiffness: 1000, damping: 50 } } }.

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
