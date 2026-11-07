// SPDX-License-Identifier: CC0-1.0
// Recessed ceiling filter module with a faceted grille, perimeter frame and indicator block.
meta({
  name: 'cleanroom-fan-filter-unit',
  license: 'CC0-1.0',
  title: 'Cleanroom fan-filter ceiling module',
  description: 'Recessed ceiling filter module with a faceted grille, perimeter frame and indicator block. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cleanroom-fan-filter-unit');
p.part('filter-housing', box(900, 900, 280, true).translate(0, 0, 140).scale(scale).color(enamel));
p.part('perimeter-frame', box(972, 972, 52, true).translate(0, 0, 280).scale(scale).color(steel));
p.part('filter-slat-0', box(747, 18, 22, true).translate(0, -360, 301).scale(scale).color(stainless));
p.part('filter-slat-1', box(747, 18, 22, true).translate(0, -240, 301).scale(scale).color(stainless));
p.part('filter-slat-2', box(747, 18, 22, true).translate(0, -120, 301).scale(scale).color(stainless));
p.part('filter-slat-3', box(747, 18, 22, true).translate(0, 0, 301).scale(scale).color(stainless));
p.part('filter-slat-4', box(747, 18, 22, true).translate(0, 120, 301).scale(scale).color(stainless));
p.part('filter-slat-5', box(747, 18, 22, true).translate(0, 240, 301).scale(scale).color(stainless));
p.part('filter-slat-6', box(747, 18, 22, true).translate(0, 360, 301).scale(scale).color(stainless));
p.part('indicator', box(54, 35, 24, true).translate(351, -270, 308).scale(scale).color(polymer));

return p.model();
