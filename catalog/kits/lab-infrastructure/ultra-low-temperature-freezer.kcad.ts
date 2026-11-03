// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly ultra-low-temperature freezer scene prop, modeled from scratch.
meta({
  name: 'ultra-low-temperature-freezer',
  license: 'CC0-1.0',
  title: 'Ultra-low-temperature freezer',
  description: 'Upright deep-freezer enclosure with insulated paired doors, latch bars and a top display. Knobs: overall scale, body color and accent color.',
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
const p = assembly('ultra-low-temperature-freezer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('insulated-cabinet', box(920, 850, 1868, true).translate(0, 0, 966), body);
add('toe-kick', box(846.4, 731, 64, true).translate(0, 0, 32), accent);
add('insulated-door-0', box(404.8, 30, 1653, true).translate(-207, -450.5, 1814.5), accent);
add('door-gasket-0', box(368, 12, 1482, true).translate(-207, -467.5, 1729), body);
add('latch-0', box(32, 22, 475, true).translate(-69, -501.5, 1339.5), body);
add('insulated-door-1', box(404.8, 30, 1653, true).translate(207, -450.5, 1814.5), accent);
add('door-gasket-1', box(368, 12, 1482, true).translate(207, -467.5, 1729), body);
add('latch-1', box(32, 22, 475, true).translate(345, -501.5, 1339.5), body);
add('controller', box(184, 24, 110, true).translate(312.8, -493, 1613), accent);
add('vent-0', box(44, 10, 14, true).translate(-276, -467.5, 107), body);
add('vent-1', box(44, 10, 14, true).translate(-138, -467.5, 131), body);
add('vent-2', box(44, 10, 14, true).translate(0, -467.5, 107), body);
add('vent-3', box(44, 10, 14, true).translate(138, -467.5, 131), body);
add('vent-4', box(44, 10, 14, true).translate(276, -467.5, 107), body);
add('compressor-grille', box(570.4, 24, 380, true).translate(0, 442, 532), accent);

return p.model();
