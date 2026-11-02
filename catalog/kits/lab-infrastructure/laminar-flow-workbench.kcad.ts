// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laminar-flow workbench enclosure scene prop, modeled from scratch.
meta({
  name: 'laminar-flow-workbench',
  license: 'CC0-1.0',
  title: 'Laminar-flow workbench enclosure',
  description: 'Open-front clean work enclosure with side panels, upper filter head and integrated bench. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laminar-flow-workbench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(1100, 700, 570, true).translate(0, 0, 285), body);
add('work-surface', box(1144, 735, 34, true).translate(0, 0, 587), accent);
add('side-cheek--1', box(66, 700, 780, true).translate(-517, 0, 994), body);
add('side-cheek-1', box(66, 700, 780, true).translate(517, 0, 994), body);
add('rear-chamber-wall', box(968, 56, 780, true).translate(0, 322, 994), body);
add('sash-header', box(1100, 30, 100, true).translate(0, -343, 1380), accent);
add('sash-rail', box(968, 28, 34, true).translate(0, -350, 938), accent);
add('upper-housing', box(968, 546, 170, true).translate(0, 0, 1415), accent);
add('exhaust-neck', box(242, 154, 150, true).translate(0, 84, 1575), body);
add('control-button-0', box(30, 12, 24, true).translate(-352, -378, 268.5), accent);
add('control-button-1', box(30, 12, 24, true).translate(-242, -378, 268.5), accent);
add('control-button-2', box(30, 12, 24, true).translate(-132, -378, 268.5), accent);
add('workbench-legs', box(968, 525, 342, true).translate(0, 0, 171), accent);
add('filter-grille', box(748, 98, 55, true).translate(0, 0, 1312.5), body);

return p.model();
