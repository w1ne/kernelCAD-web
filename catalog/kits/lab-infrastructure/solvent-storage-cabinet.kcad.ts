// SPDX-License-Identifier: CC0-1.0
// Tall solvent cabinet with a vented crown, two compartments and visible door pulls.
meta({
  name: 'solvent-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Solvent storage cabinet',
  description: 'Tall solvent cabinet with a vented crown, two compartments and visible door pulls. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('solvent-storage-cabinet');
p.part('cabinet-shell', box(750, 560, 1250, true).translate(0, 0, 625).scale(scale).color(enamel));
p.part('cabinet-plinth', box(690, 504, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(309.6, 18, 1220, true).translate(-165, -285.6, 1235).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 200, true).translate(-61.8, -308, 750).scale(scale).color(polymer));
p.part('door-1', box(309.6, 18, 1220, true).translate(165, -285.6, 1235).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 200, true).translate(268.2, -308, 750).scale(scale).color(polymer));
p.part('vent-slot-0', box(240, 10, 9, true).translate(0, -291.2, 979.5).scale(scale).color(polymer));
p.part('vent-slot-1', box(240, 10, 9, true).translate(0, -291.2, 1005.5).scale(scale).color(polymer));
p.part('vent-slot-2', box(240, 10, 9, true).translate(0, -291.2, 1031.5).scale(scale).color(polymer));
p.part('vent-slot-3', box(240, 10, 9, true).translate(0, -291.2, 1057.5).scale(scale).color(polymer));
p.part('vent-slot-4', box(240, 10, 9, true).translate(0, -291.2, 1083.5).scale(scale).color(polymer));

return p.model();
