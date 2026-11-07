// SPDX-License-Identifier: CC0-1.0
// Tall draining cabinet with perforated-looking shelves, paired doors and a lower drip tray.
meta({
  name: 'glassware-drying-cabinet',
  license: 'CC0-1.0',
  title: 'Glassware drying cabinet',
  description: 'Tall draining cabinet with perforated-looking shelves, paired doors and a lower drip tray. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('glassware-drying-cabinet');
p.part('cabinet-shell', box(850, 520, 1450, true).translate(0, 0, 725).scale(scale).color(enamel));
p.part('cabinet-plinth', box(782, 468, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(350.88, 18, 1420, true).translate(-187, -265.2, 1435).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 232, true).translate(-70.04, -286, 870).scale(scale).color(polymer));
p.part('door-1', box(350.88, 18, 1420, true).translate(187, -265.2, 1435).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 232, true).translate(303.96, -286, 870).scale(scale).color(polymer));
p.part('inner-shelf-0', box(748, 447.2, 18, true).translate(0, 0, 299).scale(scale).color(enamel));
p.part('inner-shelf-1', box(748, 447.2, 18, true).translate(0, 0, 589).scale(scale).color(enamel));
p.part('inner-shelf-2', box(748, 447.2, 18, true).translate(0, 0, 879).scale(scale).color(enamel));
p.part('inner-shelf-3', box(748, 447.2, 18, true).translate(0, 0, 1169).scale(scale).color(enamel));

return p.model();
