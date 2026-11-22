// SPDX-License-Identifier: MIT
// Preparation: npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
// Local catalog screw envelope, simplified threads. Dimensions in mm.
// Run verify(check:'fastener-installation', fasteners:[{part:'screw',against:['plate']}]).
// Change fixtureCase to 'remote-notch' or 'narrow-breach' to inspect the other targets.
const fixtureCase: string = 'split-bearing';
const liftedHeadMm = param('liftedHeadMm', 1.5, { min: 0, max: 3, unit: 'mm' });
const mount = assembly('local-feature-mount');
let plate = box(20, 20, 4);
if (fixtureCase === 'split-bearing') {
  plate = plate.union(box(10, 20, 4).translate(0, 0, 4))
    .subtract(cylinder(10, 3.1).translate(10, 10, 4));
}
plate = plate.subtract(cylinder(20, 1.7).translate(10, 10, -6));
if (fixtureCase === 'remote-notch') {
  plate = plate.subtract(cylinder(6, 3.1).translate(1.8, 10, -1));
}
if (fixtureCase === 'narrow-breach') {
  const slot = box(20, .4, 2).translate(0, -.2, 1)
    .rotate([0, 0, 1], 225).translate(10, 10, 0);
  plate = plate.subtract(slot);
}
mount.part('plate', plate.color('#497faf'));
mount.part('screw', (await lib.fetchPart('iso-4762-m3x10')).finish('steel'),
  { at: [10, 10, liftedHeadMm.add(4)] });
mount.virtualJoint('world-plate', { type: 'fixed', parentFrame: 'world', childLink: 'plate' });
return mount.model();
