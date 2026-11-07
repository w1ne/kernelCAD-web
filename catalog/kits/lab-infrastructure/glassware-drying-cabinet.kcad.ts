// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly glassware drying cabinet scene prop, modeled from scratch.
meta({
  name: 'glassware-drying-cabinet',
  license: 'CC0-1.0',
  title: 'Glassware drying cabinet',
  description: 'Tall draining cabinet with perforated-looking shelves, paired doors and a lower drip tray. Knobs: overall scale, body color and accent color.',
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
const p = assembly('glassware-drying-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(850, 520, 1450, true).translate(0, 0, 725), body);
add('cabinet-plinth', box(782, 468, 22, true).translate(0, 0, 11), accent);
add('door-0', box(350.88, 18, 1420, true).translate(-187, -265.2, 1435), body);
add('door-pull-0', box(14, 14, 232, true).translate(-70.04, -286, 870), accent);
add('door-1', box(350.88, 18, 1420, true).translate(187, -265.2, 1435), body);
add('door-pull-1', box(14, 14, 232, true).translate(303.96, -286, 870), accent);
add('inner-shelf-0', box(748, 447.2, 18, true).translate(0, 0, 299), accent);
add('inner-shelf-1', box(748, 447.2, 18, true).translate(0, 0, 589), accent);
add('inner-shelf-2', box(748, 447.2, 18, true).translate(0, 0, 879), accent);
add('inner-shelf-3', box(748, 447.2, 18, true).translate(0, 0, 1169), accent);

return p.model();
