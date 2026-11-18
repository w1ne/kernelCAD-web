// SPDX-License-Identifier: CC0-1.0
// Floor-mounted emergency shower fixture with pull rod, overhead spray head and eyewash bowls.
meta({
  name: 'laboratory-safety-shower',
  license: 'CC0-1.0',
  title: 'Laboratory safety shower',
  description: 'Floor-mounted emergency shower fixture with pull rod, overhead spray head and eyewash bowls. Editable material controls: enamel coating, polymer controls, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('laboratory-safety-shower');
p.part('base-plate', box(560, 430, 28, true).translate(0, 0, 14).scale(scale).color(enamel));
p.part('shower-column', cylinder(2130, 28, 8).translate(0, 0, 20).scale(scale).color(enamel));
p.part('overhead-arm', box(481.6, 42, 38, true).translate(0, 0, 2124).scale(scale).color(stainless));
p.part('shower-head', cylinder(45, 92, 10).translate(0, 0, 2060).scale(scale).color(stainless));
p.part('pull-rod', box(22, 22, 945, true).translate(-156.8, 0, 1732.5).scale(scale).color(polymer));
p.part('pull-handle', box(190, 30, 24, true).translate(-156.8, 0, 1249.5).scale(scale).color(polymer));
p.part('eyewash-stand--1', cylinder(340, 18, 8).translate(-190.4, 0, 35).scale(scale).color(enamel));
p.part('eyewash-bowl--1', cylinder(38, 62, 10).translate(-190.4, 0, 350).scale(scale).color(polymer));
p.part('spray-head--1', cylinder(30, 26, 8).translate(-190.4, 0, 388).scale(scale).color(polymer));
p.part('eyewash-stand-1', cylinder(340, 18, 8).translate(190.4, 0, 35).scale(scale).color(enamel));
p.part('eyewash-bowl-1', cylinder(38, 62, 10).translate(190.4, 0, 350).scale(scale).color(polymer));
p.part('spray-head-1', cylinder(30, 26, 8).translate(190.4, 0, 388).scale(scale).color(polymer));

return p.model();
