// SPDX-License-Identifier: CC0-1.0
// Compact sink-side water console with twin taps, valve knobs and a raised splash shield.
meta({
  name: 'laboratory-water-service-console',
  license: 'CC0-1.0',
  title: 'Laboratory water service console',
  description: 'Compact sink-side water console with twin taps, valve knobs and a raised splash shield. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-water-service-console');
p.part('splash-panel', box(680, 40, 520, true).translate(0, 96, 260).scale(scale).color(enamel));
p.part('mounting-base', box(680, 300, 40, true).translate(0, 0, 20).scale(scale).color(steel));
p.part('tap-riser-0', cylinder(374.4, 12, 8).translate(-183.6, 0, 40).scale(scale).color(stainless));
p.part('valve-handle-0', box(68, 22, 16, true).translate(-221.6, -10, 242).scale(scale).color(polymer));
p.part('tap-riser-1', cylinder(374.4, 12, 8).translate(183.6, 0, 40).scale(scale).color(stainless));
p.part('valve-handle-1', box(68, 22, 16, true).translate(145.6, -10, 242).scale(scale).color(polymer));

p.part('tap-spout-0', cylinder(95, 12, 8).rotateY(90).translate(-183.6, -16, 398.4).scale(scale).color(stainless));
p.part('tap-spout-1', cylinder(95, 12, 8).rotateY(90).translate(183.6, -16, 398.4).scale(scale).color(stainless));
return p.model();
