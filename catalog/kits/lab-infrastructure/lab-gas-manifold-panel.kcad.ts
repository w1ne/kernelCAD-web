// SPDX-License-Identifier: CC0-1.0
// Wall panel with paired inlet headers, isolation wheels and capped outlet points.
meta({
  name: 'lab-gas-manifold-panel',
  license: 'CC0-1.0',
  title: 'Laboratory gas manifold panel',
  description: 'Wall panel with paired inlet headers, isolation wheels and capped outlet points. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('lab-gas-manifold-panel');
p.part('mounting-plate', box(850, 160, 700, true).translate(0, 0, 350).scale(scale).color(enamel));
p.part('main-header', box(714, 45, 52, true).translate(0, -160, 362).scale(scale).color(enamel));
p.part('valve-riser-0', cylinder(175, 17, 8).translate(-289, -160, 336).scale(scale).color(stainless));
p.part('valve-handle-0', box(66, 20, 16, true).translate(-289, -176, 540).scale(scale).color(polymer));
p.part('outlet-0', box(38, 70, 35, true).translate(-289, -136, 633.5).scale(scale).color(polymer));
p.part('valve-riser-1', cylinder(175, 17, 8).translate(-96.333, -160, 336).scale(scale).color(stainless));
p.part('valve-handle-1', box(66, 20, 16, true).translate(-96.333, -176, 540).scale(scale).color(polymer));
p.part('outlet-1', box(38, 70, 35, true).translate(-96.333, -136, 633.5).scale(scale).color(polymer));
p.part('valve-riser-2', cylinder(175, 17, 8).translate(96.333, -160, 336).scale(scale).color(stainless));
p.part('valve-handle-2', box(66, 20, 16, true).translate(96.333, -176, 540).scale(scale).color(polymer));
p.part('outlet-2', box(38, 70, 35, true).translate(96.333, -136, 633.5).scale(scale).color(polymer));
p.part('valve-riser-3', cylinder(175, 17, 8).translate(289, -160, 336).scale(scale).color(stainless));
p.part('valve-handle-3', box(66, 20, 16, true).translate(289, -176, 540).scale(scale).color(polymer));
p.part('outlet-3', box(38, 70, 35, true).translate(289, -136, 633.5).scale(scale).color(polymer));
p.part('wall-mount--1', box(45, 150, 100, true).translate(-357, 88, 204).scale(scale).color(steel));
p.part('wall-mount-1', box(45, 150, 100, true).translate(357, 88, 204).scale(scale).color(steel));

return p.model();
