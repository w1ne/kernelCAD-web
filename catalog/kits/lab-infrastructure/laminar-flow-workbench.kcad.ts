// SPDX-License-Identifier: CC0-1.0
// Open-front clean work enclosure with side panels, upper filter head and integrated bench.
meta({
  name: 'laminar-flow-workbench',
  license: 'CC0-1.0',
  title: 'Laminar-flow workbench enclosure',
  description: 'Open-front clean work enclosure with side panels, upper filter head and integrated bench. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const glass = param('glass', '#55b7ca', { label: 'Tinted safety glass' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('laminar-flow-workbench');
p.part('base-cabinet', box(1100, 700, 570, true).translate(0, 0, 285).scale(scale).color(enamel));
p.part('work-surface', box(1144, 735, 34, true).translate(0, 0, 587).scale(scale).color(stainless));
p.part('side-cheek--1', box(66, 700, 780, true).translate(-517, 0, 994).scale(scale).color(enamel));
p.part('side-cheek-1', box(66, 700, 780, true).translate(517, 0, 994).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(968, 56, 780, true).translate(0, 322, 994).scale(scale).color(enamel));
p.part('sash-header', box(1100, 30, 100, true).translate(0, -343, 1380).scale(scale).color(enamel));
p.part('sash-rail', box(968, 28, 34, true).translate(0, -350, 938).scale(scale).color(enamel));
p.part('upper-housing', box(968, 546, 170, true).translate(0, 0, 1415).scale(scale).color(enamel));
p.part('exhaust-neck', box(242, 154, 150, true).translate(0, 84, 1575).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-352, -378, 268.5).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-242, -378, 268.5).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-132, -378, 268.5).scale(scale).color(polymer));
p.part('workbench-legs', box(968, 525, 342, true).translate(0, 0, 171).scale(scale).color(enamel));
p.part('filter-grille', box(748, 98, 55, true).translate(0, 0, 1312.5).scale(scale).color(stainless));

p.part('sash-glazing', box(850, 14, 350, true).translate(0, -328, 1160).scale(scale).color(glass));
return p.model();
