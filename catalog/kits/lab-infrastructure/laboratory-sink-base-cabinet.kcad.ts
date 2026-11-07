// SPDX-License-Identifier: CC0-1.0
// Open-back sink base cabinet with paired doors, plumbing clearance and a robust top rim.
meta({
  name: 'laboratory-sink-base-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory sink base cabinet',
  description: 'Open-back sink base cabinet with paired doors, plumbing clearance and a robust top rim. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-sink-base-cabinet');
p.part('cabinet-shell', box(800, 600, 860, true).translate(0, 0, 430).scale(scale).color(enamel));
p.part('cabinet-plinth', box(736, 540, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(330.24, 18, 830, true).translate(-176, -306, 845).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 137.6, true).translate(-65.92, -330, 516).scale(scale).color(polymer));
p.part('door-1', box(330.24, 18, 830, true).translate(176, -306, 845).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 137.6, true).translate(286.08, -330, 516).scale(scale).color(polymer));
p.part('plumbing-clearance', box(496, 18, 430, true).translate(0, 210, 627.8).scale(scale).color(enamel));

return p.model();
