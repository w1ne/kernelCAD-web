// SPDX-License-Identifier: CC0-1.0
// Bench-mounted faucet assembly with a tall neck, paired handles and a projecting spout.
meta({
  name: 'laboratory-faucet-set',
  license: 'CC0-1.0',
  title: 'Laboratory faucet set',
  description: 'Bench-mounted faucet assembly with a tall neck, paired handles and a projecting spout. Editable material controls: polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-faucet-set');
p.part('mounting-deck', box(300, 200, 40, true).translate(0, 0, 20).scale(scale).color(stainless));
p.part('riser', cylinder(355.2, 24, 8).translate(0, 0, 40).scale(scale).color(stainless));
p.part('tap-stem--1', cylinder(192, 15, 8).translate(-99, 0, 40).scale(scale).color(stainless));
p.part('tap-handle--1', box(82, 30, 18, true).translate(-99, 0, 246).scale(scale).color(polymer));
p.part('tap-stem-1', cylinder(192, 15, 8).translate(99, 0, 40).scale(scale).color(stainless));
p.part('tap-handle-1', box(82, 30, 18, true).translate(99, 0, 246).scale(scale).color(polymer));

p.part('spout', cylinder(210, 12, 10).rotateY(90).translate(40, 0, 376.2).scale(scale).color(stainless));
p.part('spout-elbow', sphere(15).translate(40, 0, 376.2).scale(scale).color(stainless));
return p.model();
