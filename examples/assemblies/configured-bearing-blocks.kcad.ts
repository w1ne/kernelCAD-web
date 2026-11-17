// SPDX-License-Identifier: MIT
// Two sizes of one bearing-block source, plus a second compact block.
//
// The assembly's own `length` param shares a name with the part. It must not
// resize either configuration. Each block is placed by a fastened mate onto
// a pad on the base, not by a copied shape with hardcoded dimensions.
//
// Pads, in the base frame (base is corner-origin 400 × 100 × 8, top at z = 8):
//   pad-a (50, 45)  compact 80 × 50, centre of the footprint
//   pad-b (190, 50) wide    110 × 70
//   pad-c (330, 45) compact again
// Half-lengths 40 and 55 leave 45 mm of clear air between the blocks.

param('length', 1, { min: 0.5, max: 5, unit: 'mm' });

const source = '../manufacturing-showcase/bearing-block.kcad.ts';
const arm = assembly('blocks');

arm.part('base', box(400, 100, 8), { material: 'aluminum-6061', process: 'cnc' })
  .connector('pad-a', { type: 'frame', origin: { kind: 'vec3', value: [50, 45, 8] }, normal: [0, 0, 1] })
  .connector('pad-b', { type: 'frame', origin: { kind: 'vec3', value: [190, 50, 8] }, normal: [0, 0, 1] })
  .connector('pad-c', { type: 'frame', origin: { kind: 'vec3', value: [330, 45, 8] }, normal: [0, 0, 1] });

await arm.instance('block-a', { source, configuration: 'compact', material: 'aluminum-6061', process: 'cnc' });
await arm.instance('block-b', { source, configuration: 'wide', material: 'aluminum-6061', process: 'cnc' });
await arm.instance('block-c', { source, configuration: 'compact', material: 'aluminum-6061', process: 'cnc' });

arm.mate('seat-a', 'base.pad-a', 'block-a.foot', 'fastened');
arm.mate('seat-b', 'base.pad-b', 'block-b.foot', 'fastened');
arm.mate('seat-c', 'base.pad-c', 'block-c.foot', 'fastened');

return arm.solvedModel();
