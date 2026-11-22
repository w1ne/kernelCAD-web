const offset = param('offset', 125, { unit: 'mm' });
const arm = assembly('placement-diagnostic');

arm.part('base', box(10, 10, 10))
  .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
arm.part('child', box(10, 10, 10), { at: [offset, 0, 0] })
  .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
arm.mate('m', 'base.p', 'child.q', 'fastened');

return arm.solvedModel({});
