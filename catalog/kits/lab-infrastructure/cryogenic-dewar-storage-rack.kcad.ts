// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cryogenic dewar storage rack scene prop, modeled from scratch.
meta({
  name: 'cryogenic-dewar-storage-rack',
  license: 'CC0-1.0',
  title: 'Cryogenic dewar storage rack',
  description: 'Floor rack for sample dewars with paired retaining hoops, shelves and anchor feet. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cryogenic-dewar-storage-rack');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-frame', box(1000, 480, 38, true).translate(0, 0, 19), accent);
add('upright--420-0', box(38, 38, 1450, true).translate(-420, 0, 725), body);
add('upright-420-0', box(38, 38, 1450, true).translate(420, 0, 725), body);
add('top-retainer', box(1000, 34, 50, true).translate(0, 0, 1390), accent);
add('dewar-body-0', cylinder(1044, 95, 10).translate(-310, 0, 45), body);
add('dewar-neck-0', cylinder(174, 40, 10).translate(-310, 0, 1089), accent);
add('retaining-strap-0', box(180, 20, 22, true).translate(-310, -220.8, 808.5), accent);
add('dewar-body-1', cylinder(1044, 95, 10).translate(0, 0, 45), body);
add('dewar-neck-1', cylinder(174, 40, 10).translate(0, 0, 1089), accent);
add('retaining-strap-1', box(180, 20, 22, true).translate(0, -220.8, 808.5), accent);
add('dewar-body-2', cylinder(1044, 95, 10).translate(310, 0, 45), body);
add('dewar-neck-2', cylinder(174, 40, 10).translate(310, 0, 1089), accent);
add('retaining-strap-2', box(180, 20, 22, true).translate(310, -220.8, 808.5), accent);

return p.model();
