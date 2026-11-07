// SPDX-License-Identifier: CC0-1.0
// Wall-hung reagent cabinet with glazed-looking paired doors, side rails and a deep canopy.
meta({
  name: 'wall-reagent-cabinet',
  license: 'CC0-1.0',
  title: 'Wall reagent cabinet',
  description: 'Wall-hung reagent cabinet with glazed-looking paired doors, side rails and a deep canopy. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', steel: '#33464d' },
});
const p = assembly('wall-reagent-cabinet');
p.part('cabinet-shell', box(1000, 360, 720, true).translate(0, 0, 360).scale(scale).color(enamel));
p.part('cabinet-plinth', box(920, 324, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(412.8, 18, 690, true).translate(-220, -183.6, 705).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 115.2, true).translate(-82.4, -198, 432).scale(scale).color(polymer));
p.part('door-1', box(412.8, 18, 690, true).translate(220, -183.6, 705).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 115.2, true).translate(357.6, -198, 432).scale(scale).color(polymer));
p.part('wall-bracket--1', box(35, 198, 170, true).translate(-350, 72, 85).scale(scale).color(steel));
p.part('wall-bracket-1', box(35, 198, 170, true).translate(350, 72, 85).scale(scale).color(steel));

return p.model();
