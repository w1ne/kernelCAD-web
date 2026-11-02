// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory refrigerator scene prop, modeled from scratch.
meta({
  name: 'laboratory-refrigerator',
  license: 'CC0-1.0',
  title: 'Laboratory refrigerator',
  description: 'Tall laboratory cold-storage cabinet with a thick door, status panel and lower grille. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-refrigerator');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('insulated-cabinet', box(760, 760, 1918, true).translate(0, 0, 991), body);
add('toe-kick', box(699.2, 653.6, 64, true).translate(0, 0, 32), accent);
add('insulated-door-0', box(668.8, 30, 1696.5, true).translate(0, -402.8, 1862.25), accent);
add('door-gasket-0', box(608, 12, 1521, true).translate(0, -418, 1774.5), body);
add('latch-0', box(32, 22, 487.5, true).translate(228, -448.4, 1374.75), body);
add('controller', box(152, 24, 110, true).translate(258.4, -440.8, 1654), accent);
add('vent-0', box(44, 10, 14, true).translate(-228, -418, 107), body);
add('vent-1', box(44, 10, 14, true).translate(-114, -418, 131), body);
add('vent-2', box(44, 10, 14, true).translate(0, -418, 107), body);
add('vent-3', box(44, 10, 14, true).translate(114, -418, 131), body);
add('vent-4', box(44, 10, 14, true).translate(228, -418, 107), body);

return p.model();
