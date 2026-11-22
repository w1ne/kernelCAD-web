// SPDX-License-Identifier: MIT
// Two-body placement fixture, not a manufactured linear guide.
const travelMm = param('travelMm', 5, { min: 0, max: 15 });
const arm = assembly('fixed base slide');
// The moving part is intentionally declared before the fixed base.
arm.part('slide', box(8, 8, 4).finish('paint-matte').color('#4076cc'), { at: [0, 0, 4] })
  .connector('rail', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
arm.part('base', box(30, 12, 4).finish('aluminium'), { at: [20, 0, 0] })
  .connector('rail', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [1, 0, 0] });
arm.mate('travel', 'base.rail', 'slide.rail', 'prismatic', { limitsMm: [0, 15], pose: travelMm });
arm.virtualJoint('world-base', { type: 'fixed', parentFrame: 'world', childLink: 'base' });
return arm.model();
