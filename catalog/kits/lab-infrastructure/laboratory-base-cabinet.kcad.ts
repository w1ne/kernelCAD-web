// SPDX-License-Identifier: CC0-1.0
// Modular underbench cabinet with paired doors, recessed plinth, pulls and an inset worktop.
meta({
  name: 'laboratory-base-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory base cabinet',
  description: 'Modular underbench cabinet with paired doors, recessed plinth, pulls and an inset worktop. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-base-cabinet');
p.part('cabinet-shell', box(900, 570, 870, true).translate(0, 0, 435).scale(scale).color(enamel));
p.part('cabinet-plinth', box(828, 513, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(371.52, 18, 840, true).translate(-198, -290.7, 855).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 139.2, true).translate(-74.16, -313.5, 522).scale(scale).color(polymer));
p.part('door-1', box(371.52, 18, 840, true).translate(198, -290.7, 855).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 139.2, true).translate(321.84, -313.5, 522).scale(scale).color(polymer));

return p.model();
