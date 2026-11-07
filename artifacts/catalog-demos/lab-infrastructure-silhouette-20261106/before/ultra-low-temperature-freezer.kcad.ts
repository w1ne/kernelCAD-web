// SPDX-License-Identifier: CC0-1.0
// Upright deep-freezer enclosure with insulated paired doors, latch bars and a top display.
meta({
  name: 'ultra-low-temperature-freezer',
  license: 'CC0-1.0',
  title: 'Ultra-low-temperature freezer',
  description: 'Upright deep-freezer enclosure with insulated paired doors, latch bars and a top display. Editable material controls: enamel coating, polymer controls, rubber and seals, stainless steel; presets: cleanroom and high visibility.',
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
const rubber = param('rubber', '#30363a', { label: 'Rubber and seals' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', rubber: '#484f52', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', rubber: '#202528', stainless: '#6f8488' },
});
const p = assembly('ultra-low-temperature-freezer');
p.part('insulated-cabinet', box(920, 850, 1868, true).translate(0, 0, 966).scale(scale).color(enamel));
p.part('toe-kick', box(846.4, 731, 64, true).translate(0, 0, 32).scale(scale).color(enamel));
p.part('insulated-door-0', box(404.8, 30, 1653, true).translate(-207, -450.5, 1814.5).scale(scale).color(enamel));
p.part('latch-0', box(32, 22, 475, true).translate(-69, -501.5, 1339.5).scale(scale).color(polymer));
p.part('insulated-door-1', box(404.8, 30, 1653, true).translate(207, -450.5, 1814.5).scale(scale).color(enamel));
p.part('latch-1', box(32, 22, 475, true).translate(345, -501.5, 1339.5).scale(scale).color(polymer));
p.part('controller', box(184, 24, 110, true).translate(312.8, -493, 1613).scale(scale).color(polymer));
p.part('vent-0', box(44, 10, 14, true).translate(-276, -467.5, 107).scale(scale).color(enamel));
p.part('vent-1', box(44, 10, 14, true).translate(-138, -467.5, 131).scale(scale).color(enamel));
p.part('vent-2', box(44, 10, 14, true).translate(0, -467.5, 107).scale(scale).color(enamel));
p.part('vent-3', box(44, 10, 14, true).translate(138, -467.5, 131).scale(scale).color(enamel));
p.part('vent-4', box(44, 10, 14, true).translate(276, -467.5, 107).scale(scale).color(enamel));
p.part('compressor-grille', box(570.4, 24, 380, true).translate(0, 442, 532).scale(scale).color(stainless));

// Four narrow rubber seal strips frame each insulated door leaf.
p.part('door-seal-left-0', box(18, 12, 1482, true).translate(-382, -467.5, 1729).scale(scale).color(rubber));
p.part('door-seal-right-0', box(18, 12, 1482, true).translate(-32, -467.5, 1729).scale(scale).color(rubber));
p.part('door-seal-top-0', box(350, 12, 18, true).translate(-207, -467.5, 2461).scale(scale).color(rubber));
p.part('door-seal-bottom-0', box(350, 12, 18, true).translate(-207, -467.5, 997).scale(scale).color(rubber));
p.part('door-seal-left-1', box(18, 12, 1482, true).translate(32, -467.5, 1729).scale(scale).color(rubber));
p.part('door-seal-right-1', box(18, 12, 1482, true).translate(382, -467.5, 1729).scale(scale).color(rubber));
p.part('door-seal-top-1', box(350, 12, 18, true).translate(207, -467.5, 2461).scale(scale).color(rubber));
p.part('door-seal-bottom-1', box(350, 12, 18, true).translate(207, -467.5, 997).scale(scale).color(rubber));
return p.model();
