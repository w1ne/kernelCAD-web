// Small two-part arm for the browser kernel tests and the click-to-frame
// benchmark: one param re-lowers a part (width), one only re-poses the
// assembly (elbowDeg), and one is a choice that is written into the source.
const width = param('width', 40, { min: 20, max: 80, step: 1, unit: 'mm' });
const elbowDeg = param('elbowDeg', 0, { min: -60, max: 60, step: 1, unit: '°' });
const finish = param('finish', 'matte', { choices: ['matte', 'gloss'] });

const arm = assembly('fixture-arm');
const base = arm.part(
  'base',
  // The plate grows towards -X, so a width edit moves the model's bounds.
  box(width, 30, 6).translate(width.negate(), -15, 0).union(cylinder(6, 20).translate(0, 0, 6)),
  { material: 'aluminum-6061' },
);
base.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 26] }, axis: [0, 1, 0] });
const link = arm.part(
  'link',
  box(60, 10, 6).translate(30, 0, 0).color(finish.value === 'gloss' ? '#d04040' : '#4060d0'),
  { material: 'aluminum-6061' },
);
link.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('elbow', 'base.pivot', 'link.pivot', 'revolute', { pose: elbowDeg, limitsDeg: [-60, 60] });

return arm.solvedModel({}, { ignore: [['base', 'link']] });
