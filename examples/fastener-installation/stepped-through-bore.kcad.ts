// SPDX-License-Identifier: MIT
// Preparation: npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
// Existing MCP call: verify({check:'fastener-installation',file,
//   fasteners:[{part:'screw',against:['plate']}]})
// Dimensions in mm; simplified catalog threads. Change the case and repeat.
const fixtureCase: string = 'stepped'; // straight | stepped | web | narrow-breach
const mount = assembly('stepped-through-bore');
let plate = box(20, 20, 6.4);
if (fixtureCase === 'web') {
  // Two coaxial blind holes leave a real 0.2 mm web at z=3..3.2.
  plate = plate.hole('bottom', { u: 0, v: 0, diameter: 3.5, depth: 3 })
    .hole('top', { u: 0, v: 0, diameter: 6.6, depth: 3.2 });
} else if (fixtureCase === 'straight') {
  plate = plate.hole('top', { u: 0, v: 0, diameter: 3.5, depth: 'through' });
} else {
  // Native counterbore: the larger rear clearance shares one open through-path.
  plate = plate.hole('top', { u: 0, v: 0, diameter: 3.5, depth: 'through',
    counterbore: { diameter: 6.6, depth: 3.4 } });
}
if (fixtureCase === 'narrow-breach') {
  plate = plate.subtract(box(15, .4, 1).translate(0, -.2, 4)
    .rotate([0, 0, 1], 315).translate(10, 10, 0));
}
mount.part('plate', plate.color('#497faf'));
mount.part('screw', (await lib.fetchPart('iso-4762-m3x10')).finish('steel')
  .rotate([1, 0, 0], 180), { at: [10, 10, 0] });
mount.virtualJoint('world-plate', { type: 'fixed', parentFrame: 'world', childLink: 'plate' });
return mount.model();
