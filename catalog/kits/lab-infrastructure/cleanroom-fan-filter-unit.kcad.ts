// SPDX-License-Identifier: CC0-1.0
// Recessed ceiling fan-filter module: an enamel fan housing, a steel T-grid
// flange around a white HEPA filter-media face, stainless diffuser bars and a
// status indicator. Authored filter face up; rotate 180 degrees about X to hang
// it in a ceiling grid.
meta({
  name: 'cleanroom-fan-filter-unit',
  license: 'CC0-1.0',
  title: 'Cleanroom fan-filter ceiling module',
  description: 'Recessed ceiling fan-filter module with an enamel housing, steel perimeter flange, white HEPA filter-media face, stainless diffuser bars and a status indicator. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel, HEPA filter media; presets: cleanroom and high visibility.',
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
const filterMedia = param('filterMedia', '#eef0ea', { label: 'HEPA filter media' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8', steel: '#75888d', filterMedia: '#f6f8f4' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488', steel: '#33464d', filterMedia: '#e4e6dc' },
});
const p = assembly('cleanroom-fan-filter-unit');
p.part('filter-housing', box(900, 900, 280, true).translate(0, 0, 140).scale(scale).color(enamel));
p.part('perimeter-frame', box(972, 972, 52, true).subtract(box(800, 800, 60, true)).translate(0, 0, 280).scale(scale).color(steel));
p.part('filter-media', box(800, 800, 40, true).translate(0, 0, 280).scale(scale).color(filterMedia));
p.part('filter-slat-0', box(747, 18, 22, true).translate(0, -360, 301).scale(scale).color(stainless));
p.part('filter-slat-1', box(747, 18, 22, true).translate(0, -240, 301).scale(scale).color(stainless));
p.part('filter-slat-2', box(747, 18, 22, true).translate(0, -120, 301).scale(scale).color(stainless));
p.part('filter-slat-3', box(747, 18, 22, true).translate(0, 0, 301).scale(scale).color(stainless));
p.part('filter-slat-4', box(747, 18, 22, true).translate(0, 120, 301).scale(scale).color(stainless));
p.part('filter-slat-5', box(747, 18, 22, true).translate(0, 240, 301).scale(scale).color(stainless));
p.part('filter-slat-6', box(747, 18, 22, true).translate(0, 360, 301).scale(scale).color(stainless));
p.part('indicator', box(54, 35, 24, true).translate(351, -270, 308).scale(scale).color(polymer));

return p.model();
