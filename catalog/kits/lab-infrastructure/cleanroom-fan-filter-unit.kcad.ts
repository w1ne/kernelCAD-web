// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom fan-filter ceiling module scene prop, modeled from scratch.
meta({
  name: 'cleanroom-fan-filter-unit',
  license: 'CC0-1.0',
  title: 'Cleanroom fan-filter ceiling module',
  description: 'Recessed ceiling filter module with a faceted grille, perimeter frame and indicator block. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-fan-filter-unit');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('filter-housing', box(900, 900, 280, true).translate(0, 0, 140), body);
add('perimeter-frame', box(972, 972, 52, true).translate(0, 0, 280), accent);
add('filter-slat-0', box(747, 18, 22, true).translate(0, -360, 301), accent);
add('filter-slat-1', box(747, 18, 22, true).translate(0, -240, 301), accent);
add('filter-slat-2', box(747, 18, 22, true).translate(0, -120, 301), accent);
add('filter-slat-3', box(747, 18, 22, true).translate(0, 0, 301), accent);
add('filter-slat-4', box(747, 18, 22, true).translate(0, 120, 301), accent);
add('filter-slat-5', box(747, 18, 22, true).translate(0, 240, 301), accent);
add('filter-slat-6', box(747, 18, 22, true).translate(0, 360, 301), accent);
add('indicator', box(54, 35, 24, true).translate(351, -270, 308), body);

return p.model();
