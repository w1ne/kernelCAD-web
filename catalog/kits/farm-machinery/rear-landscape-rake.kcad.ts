// SPDX-License-Identifier: CC0-1.0
// Three-point landscape rake with angled end plates, long toolbar and closely spaced tines.
meta({
  name: "rear-landscape-rake",
  license: 'CC0-1.0',
  title: "Rear landscape rake",
  description: "Three-point landscape rake with angled end plates, long toolbar and closely spaced tines. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad' },
});
const p = assembly('rear-landscape-rake');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(1107, 100, 359.6, true).translate(0, 146.2, 239.8), paintedSteelColor);
add('crossbar', box(1350, 95, 80, true).translate(0, 98.9, 424.4), paintedSteelColor);
add('rake-beam', box(1350, 110, 90, true).translate(0, 0, 386), paintedSteelColor);
add('rake-tooth-0', box(24, 55, 334.8, true).translate(-621, -150.5, 167.4), steelColor);
add('rake-tooth-1', box(24, 55, 334.8, true).translate(-517.5, -150.5, 167.4), steelColor);
add('rake-tooth-2', box(24, 55, 334.8, true).translate(-414, -150.5, 167.4), steelColor);
add('rake-tooth-3', box(24, 55, 334.8, true).translate(-310.5, -150.5, 167.4), steelColor);
add('rake-tooth-4', box(24, 55, 334.8, true).translate(-207, -150.5, 167.4), steelColor);
add('rake-tooth-5', box(24, 55, 334.8, true).translate(-103.5, -150.5, 167.4), steelColor);
add('rake-tooth-6', box(24, 55, 334.8, true).translate(0, -150.5, 167.4), steelColor);
add('rake-tooth-7', box(24, 55, 334.8, true).translate(103.5, -150.5, 167.4), steelColor);
add('rake-tooth-8', box(24, 55, 334.8, true).translate(207, -150.5, 167.4), steelColor);
add('rake-tooth-9', box(24, 55, 334.8, true).translate(310.5, -150.5, 167.4), steelColor);
add('rake-tooth-10', box(24, 55, 334.8, true).translate(414, -150.5, 167.4), steelColor);
add('rake-tooth-11', box(24, 55, 334.8, true).translate(517.5, -150.5, 167.4), steelColor);
add('rake-tooth-12', box(24, 55, 334.8, true).translate(621, -150.5, 167.4), steelColor);

return p.model();
