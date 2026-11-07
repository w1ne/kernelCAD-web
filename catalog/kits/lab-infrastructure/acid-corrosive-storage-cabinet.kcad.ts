// SPDX-License-Identifier: CC0-1.0
// Low corrosive-storage cabinet with a raised spill lip, paired doors and hazard-color plinth.
meta({
  name: 'acid-corrosive-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Acid and corrosive storage cabinet',
  description: 'Low corrosive-storage cabinet with a raised spill lip, paired doors and hazard-color plinth. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('acid-corrosive-storage-cabinet');
p.part('cabinet-shell', box(700, 550, 780, true).translate(0, 0, 390).scale(scale).color(enamel));
p.part('cabinet-plinth', box(644, 495, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(288.96, 18, 750, true).translate(-154, -280.5, 765).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 124.8, true).translate(-57.68, -302.5, 468).scale(scale).color(polymer));
p.part('door-1', box(288.96, 18, 750, true).translate(154, -280.5, 765).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 124.8, true).translate(250.32, -302.5, 468).scale(scale).color(polymer));
p.part('warning-band', box(644, 12, 50, true).translate(0, -291.5, 703.6).scale(scale).color(polymer));

return p.model();
