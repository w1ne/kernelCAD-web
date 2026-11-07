// SPDX-License-Identifier: CC0-1.0
// Wet bench with an inset wash basin, high-neck faucet, splashback and two storage bays.
meta({
  name: 'wet-lab-sink-bench',
  license: 'CC0-1.0',
  title: 'Wet-lab sink bench',
  description: 'Wet bench with an inset wash basin, high-neck faucet, splashback and two storage bays. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('wet-lab-sink-bench');
p.part('worktop', box(1500, 700, 32, true).translate(0, 0, 884).scale(scale).color(stainless));
p.part('cabinet-kick-plinth', box(1350, 574, 80, true).translate(0, 0, 40).scale(scale).color(steel));
p.part('base-carcass-0', box(567.6, 546, 750, true).translate(-330, 0, 455).scale(scale).color(enamel));
p.part('base-door-0', box(522.192, 18, 715, true).translate(-330, -280, 447.5).scale(scale).color(enamel));
p.part('door-pull-0', box(12, 18, 110, true).translate(-148.368, -301, 523).scale(scale).color(polymer));
p.part('base-carcass-1', box(567.6, 546, 750, true).translate(330, 0, 455).scale(scale).color(enamel));
p.part('base-door-1', box(522.192, 18, 715, true).translate(330, -280, 447.5).scale(scale).color(enamel));
p.part('door-pull-1', box(12, 18, 110, true).translate(511.632, -301, 523).scale(scale).color(polymer));
p.part('splashback', box(1500, 32, 250, true).translate(0, 322, 1150).scale(scale).color(enamel));
p.part('sink-basin', box(510, 315, 80, true).translate(330, 0, 823).scale(scale).color(stainless));
p.part('sink-well', box(375, 224, 48, true).translate(330, -14, 822).scale(scale).color(stainless));
p.part('faucet-riser', cylinder(185, 13, 8).translate(330, 196, 920).scale(scale).color(stainless));
p.part('faucet-spout', box(135, 22, 20, true).translate(330, 98, 1100).scale(scale).color(stainless));

return p.model();
