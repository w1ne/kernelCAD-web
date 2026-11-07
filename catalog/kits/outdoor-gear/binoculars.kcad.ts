// Original low-poly field binoculars with twin barrels, eye cups and lenses.
// Millimetres, Z up.

meta({
  name: 'binoculars',
  license: 'CC0-1.0',
  title: 'Field binoculars',
  description: 'Compact field binoculars with twin objective barrels, bridge, eye cups and blue objective lenses. Knobs: magnification, body, trim and glass colours.',
  tags: ['binoculars', 'field glasses', 'optics', 'camping', 'hiking', 'outdoor'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'center',
  compat: ['outdoor', 'camping', 'hiking', 'trail', 'wildlife'],
  triangleBudget: 500,
});

const magnification = param('magnification', '8x', { choices: ['8x', '10x'], label: 'Magnification' });
const body = param('body', '#3b4140', { label: 'Body' });
const trim = param('trim', '#b6aa82', { label: 'Trim' });
const glass = param('glass', '#43748a', { label: 'Lenses' });
presets({
  field: { body: '#45564a', trim: '#c7b786', glass: '#557f91' },
  alpine: { body: '#314657', trim: '#d6d2c3', glass: '#6db7c4' },
});

const length = magnification.value === '8x' ? 190 : 225;
const radius = magnification.value === '8x' ? 58 : 64;
const optics = assembly('binoculars');
for (const x of [-68, 68]) {
  const side = x < 0 ? 'left' : 'right';
  optics.part(side + '-barrel', cylinder(length, radius, 10).rotateX(90).translate(x, length / 2, 82).color(body));
  optics.part(side + '-eye-cup', cylinder(38, 39, 10).rotateX(90).translate(x, length / 2 + 2, 82).color(trim));
  optics.part(side + '-objective-rim', cylinder(18, radius + 5, 10).rotateX(90).translate(x, -length / 2, 82).color(trim));
  optics.part(side + '-objective-lens', cylinder(10, radius - 12, 10).rotateX(90).translate(x, -length / 2 - 18, 82).color(glass));
}
optics.part('center-bridge', box(88, 72, 42, true).translate(0, 0, 82).color(trim));
optics.part('focus-wheel', cylinder(22, 34, 10).rotateX(90).translate(0, 54, 84).color(trim));

return optics.model();
