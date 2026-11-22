// SPDX-License-Identifier: CC0-1.0
// Wide chisel plow with a folding-looking frame, spring shanks and narrow soil points.
meta({
  name: "chisel-plow",
  license: 'CC0-1.0',
  title: "Chisel plow",
  description: "Wide chisel plow with a folding-looking frame, spring shanks and narrow soil points. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
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
const p = assembly('chisel-plow');
const groundOffset = 22;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(2200, 110, 94, true).translate(0, 132, 381.8), paintedSteelColor);
add('drawbar', box(135, 616, 70, true).translate(0, 473, 419.4), paintedSteelColor);
add('standard-0', box(42, 58, 384.4, true).translate(-924, 0, 222.2), steelColor);
add('chisel-point-0', box(86, 180, 44, true).translate(-924, -176, 44), paintedSteelColor);
add('standard-1', box(42, 58, 384.4, true).translate(-616, 0, 222.2), steelColor);
add('chisel-point-1', box(86, 180, 44, true).translate(-616, -176, 44), paintedSteelColor);
add('standard-2', box(42, 58, 384.4, true).translate(-308, 0, 222.2), steelColor);
add('chisel-point-2', box(86, 180, 44, true).translate(-308, -176, 44), paintedSteelColor);
add('standard-3', box(42, 58, 384.4, true).translate(0, 0, 222.2), steelColor);
add('chisel-point-3', box(86, 180, 44, true).translate(0, -176, 44), paintedSteelColor);
add('standard-4', box(42, 58, 384.4, true).translate(308, 0, 222.2), steelColor);
add('chisel-point-4', box(86, 180, 44, true).translate(308, -176, 44), paintedSteelColor);
add('standard-5', box(42, 58, 384.4, true).translate(616, 0, 222.2), steelColor);
add('chisel-point-5', box(86, 180, 44, true).translate(616, -176, 44), paintedSteelColor);
add('standard-6', box(42, 58, 384.4, true).translate(924, 0, 222.2), steelColor);
add('chisel-point-6', box(86, 180, 44, true).translate(924, -176, 44), paintedSteelColor);

return p.model();
