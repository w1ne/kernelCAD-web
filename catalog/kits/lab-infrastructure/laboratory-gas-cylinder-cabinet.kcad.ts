// SPDX-License-Identifier: CC0-1.0
// Tall ventilated gas-cylinder enclosure with a pair of doors, top duct and retaining rail.
meta({
  name: 'laboratory-gas-cylinder-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory gas-cylinder cabinet',
  description: 'Tall ventilated gas-cylinder enclosure with a pair of doors, top duct and retaining rail. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('laboratory-gas-cylinder-cabinet');
p.part('cabinet-shell', box(900, 650, 1900, true).translate(0, 0, 950).scale(scale).color(enamel));
p.part('cabinet-plinth', box(828, 585, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(371.52, 18, 1870, true).translate(-198, -331.5, 1885).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 304, true).translate(-74.16, -357.5, 1140).scale(scale).color(polymer));
p.part('door-1', box(371.52, 18, 1870, true).translate(198, -331.5, 1885).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 304, true).translate(321.84, -357.5, 1140).scale(scale).color(polymer));
p.part('vent-slot-0', box(288, 10, 9, true).translate(0, -338, 1486.5).scale(scale).color(polymer));
p.part('vent-slot-1', box(288, 10, 9, true).translate(0, -338, 1512.5).scale(scale).color(polymer));
p.part('vent-slot-2', box(288, 10, 9, true).translate(0, -338, 1538.5).scale(scale).color(polymer));
p.part('vent-slot-3', box(288, 10, 9, true).translate(0, -338, 1564.5).scale(scale).color(polymer));
p.part('vent-slot-4', box(288, 10, 9, true).translate(0, -338, 1590.5).scale(scale).color(polymer));
p.part('exhaust-neck', box(270, 260, 220, true).translate(0, 0, 2005).scale(scale).color(stainless));

return p.model();
