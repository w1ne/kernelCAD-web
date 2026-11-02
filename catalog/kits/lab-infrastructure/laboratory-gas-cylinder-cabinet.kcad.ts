// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory gas-cylinder cabinet scene prop, modeled from scratch.
meta({
  name: 'laboratory-gas-cylinder-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory gas-cylinder cabinet',
  description: 'Tall ventilated gas-cylinder enclosure with a pair of doors, top duct and retaining rail. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('laboratory-gas-cylinder-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(900, 650, 1900, true).translate(0, 0, 950), body);
add('cabinet-plinth', box(828, 585, 22, true).translate(0, 0, 11), accent);
add('door-0', box(371.52, 18, 1870, true).translate(-198, -331.5, 1885), body);
add('door-pull-0', box(14, 14, 304, true).translate(-74.16, -357.5, 1140), accent);
add('door-1', box(371.52, 18, 1870, true).translate(198, -331.5, 1885), body);
add('door-pull-1', box(14, 14, 304, true).translate(321.84, -357.5, 1140), accent);
add('vent-slot-0', box(288, 10, 9, true).translate(0, -338, 1486.5), accent);
add('vent-slot-1', box(288, 10, 9, true).translate(0, -338, 1512.5), accent);
add('vent-slot-2', box(288, 10, 9, true).translate(0, -338, 1538.5), accent);
add('vent-slot-3', box(288, 10, 9, true).translate(0, -338, 1564.5), accent);
add('vent-slot-4', box(288, 10, 9, true).translate(0, -338, 1590.5), accent);
add('exhaust-neck', box(270, 260, 220, true).translate(0, 0, 2005), accent);

return p.model();
