// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly undercounter laboratory freezer scene prop, modeled from scratch.
meta({
  name: 'undercounter-laboratory-freezer',
  license: 'CC0-1.0',
  title: 'Undercounter laboratory freezer',
  description: 'Compact underbench cold-storage cabinet with an insulated door, toe kick and controller. Knobs: overall scale, body color and accent color.',
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
const p = assembly('undercounter-laboratory-freezer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('insulated-cabinet', box(700, 700, 818, true).translate(0, 0, 441), body);
add('toe-kick', box(644, 602, 64, true).translate(0, 0, 32), accent);
add('insulated-door-0', box(616, 30, 739.5, true).translate(0, -371, 811.75), accent);
add('door-gasket-0', box(560, 12, 663, true).translate(0, -385, 773.5), body);
add('latch-0', box(32, 22, 212.5, true).translate(210, -413, 599.25), body);
add('controller', box(140, 24, 110, true).translate(238, -406, 752), accent);
add('vent-0', box(44, 10, 14, true).translate(-210, -385, 107), body);
add('vent-1', box(44, 10, 14, true).translate(-105, -385, 131), body);
add('vent-2', box(44, 10, 14, true).translate(0, -385, 107), body);
add('vent-3', box(44, 10, 14, true).translate(105, -385, 131), body);
add('vent-4', box(44, 10, 14, true).translate(210, -385, 107), body);
add('compressor-grille', box(434, 24, 170, true).translate(0, 364, 238), accent);

return p.model();
