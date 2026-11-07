// SPDX-License-Identifier: CC0-1.0
// Long floor trough with a grated top, end outlet and raised cleaning rim.
meta({
  name: 'laboratory-floor-drain-trough',
  license: 'CC0-1.0',
  title: 'Laboratory floor-drain trough',
  description: 'Long floor trough with a grated top, end outlet and raised cleaning rim. Editable material controls: polymer controls, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('laboratory-floor-drain-trough');
p.part('drain-trough', box(1200, 220, 100, true).translate(0, 0, 50).scale(scale).color(stainless));
p.part('grate-lip', box(1248, 228.8, 20, true).translate(0, 0, 110).scale(scale).color(stainless));
p.part('grate-bar-0', box(12, 198, 10, true).translate(-540, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-1', box(12, 198, 10, true).translate(-420, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-2', box(12, 198, 10, true).translate(-300, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-3', box(12, 198, 10, true).translate(-180, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-4', box(12, 198, 10, true).translate(-60, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-5', box(12, 198, 10, true).translate(60, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-6', box(12, 198, 10, true).translate(180, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-7', box(12, 198, 10, true).translate(300, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-8', box(12, 198, 10, true).translate(420, 0, 125).scale(scale).color(stainless));
p.part('grate-bar-9', box(12, 198, 10, true).translate(540, 0, 125).scale(scale).color(stainless));
p.part('end-outlet', cylinder(130, 30, 8).translate(504, 0, 0).scale(scale).color(polymer));

return p.model();
