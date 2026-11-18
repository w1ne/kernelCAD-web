// SPDX-License-Identifier: CC0-1.0
// Tall laboratory cold-storage cabinet with a thick door, status panel and lower grille.
meta({
  name: 'laboratory-refrigerator',
  license: 'CC0-1.0',
  title: 'Laboratory refrigerator',
  description: 'Tall laboratory cold-storage cabinet with a thick door, status panel and lower grille. Editable material controls: enamel coating, polymer controls, rubber and seals, structural steel; presets: cleanroom and high visibility.',
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
const rubber = param('rubber', '#30363a', { label: 'Rubber and seals' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', rubber: '#484f52', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', rubber: '#202528', steel: '#33464d' },
});
const p = assembly('laboratory-refrigerator');
p.part('insulated-cabinet', box(760, 760, 1918, true).translate(0, 0, 991).scale(scale).color(enamel));
p.part('toe-kick', box(699.2, 653.6, 64, true).translate(0, 0, 32).scale(scale).color(steel));
p.part('insulated-door-0', box(668.8, 30, 1696.5, true).translate(0, -402.8, 1862.25).scale(scale).color(enamel));
p.part('door-gasket-0', box(608, 12, 1521, true).translate(0, -418, 1774.5).scale(scale).color(rubber));
p.part('latch-0', box(32, 22, 487.5, true).translate(228, -448.4, 1374.75).scale(scale).color(polymer));
p.part('controller', box(152, 24, 110, true).translate(258.4, -440.8, 1654).scale(scale).color(polymer));
p.part('vent-0', box(44, 10, 14, true).translate(-228, -418, 107).scale(scale).color(enamel));
p.part('vent-1', box(44, 10, 14, true).translate(-114, -418, 131).scale(scale).color(enamel));
p.part('vent-2', box(44, 10, 14, true).translate(0, -418, 107).scale(scale).color(enamel));
p.part('vent-3', box(44, 10, 14, true).translate(114, -418, 131).scale(scale).color(enamel));
p.part('vent-4', box(44, 10, 14, true).translate(228, -418, 107).scale(scale).color(enamel));

return p.model();
