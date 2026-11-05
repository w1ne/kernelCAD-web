// SPDX-License-Identifier: CC0-1.0
// Double-door chemical storage cabinet with contrasting warning panel, vents and raised feet.
meta({
  name: 'flammable-liquid-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Flammable-liquid storage cabinet',
  description: 'Double-door chemical storage cabinet with contrasting warning panel, vents and raised feet. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('flammable-liquid-storage-cabinet');
p.part('cabinet-shell', box(900, 600, 1100, true).translate(0, 0, 550).scale(scale).color(enamel));
p.part('cabinet-plinth', box(828, 540, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(371.52, 18, 1070, true).translate(-198, -306, 1085).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 176, true).translate(-74.16, -330, 660).scale(scale).color(polymer));
p.part('door-1', box(371.52, 18, 1070, true).translate(198, -306, 1085).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 176, true).translate(321.84, -330, 660).scale(scale).color(polymer));
p.part('vent-slot-0', box(288, 10, 9, true).translate(0, -312, 862.5).scale(scale).color(polymer));
p.part('vent-slot-1', box(288, 10, 9, true).translate(0, -312, 888.5).scale(scale).color(polymer));
p.part('vent-slot-2', box(288, 10, 9, true).translate(0, -312, 914.5).scale(scale).color(polymer));
p.part('vent-slot-3', box(288, 10, 9, true).translate(0, -312, 940.5).scale(scale).color(polymer));
p.part('vent-slot-4', box(288, 10, 9, true).translate(0, -312, 966.5).scale(scale).color(polymer));
p.part('warning-band', box(828, 12, 50, true).translate(0, -318, 982).scale(scale).color(polymer));

return p.model();
