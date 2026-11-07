// SPDX-License-Identifier: CC0-1.0
// Wall-mounted laboratory workbench with a chemical-resistant top, base units and rear service upstand.
meta({
  name: 'wall-lab-bench',
  license: 'CC0-1.0',
  title: 'Wall laboratory bench',
  description: 'Wall-mounted laboratory workbench with a chemical-resistant top, base units and rear service upstand. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('wall-lab-bench');
p.part('worktop', box(1500, 650, 32, true).translate(0, 0, 884).scale(scale).color(stainless));
p.part('cabinet-kick-plinth', box(1350, 533, 80, true).translate(0, 0, 40).scale(scale).color(steel));
p.part('base-carcass-0', box(567.6, 507, 750, true).translate(-330, 0, 455).scale(scale).color(enamel));
p.part('base-door-0', box(522.192, 18, 715, true).translate(-330, -260, 447.5).scale(scale).color(enamel));
p.part('door-pull-0', box(12, 18, 110, true).translate(-148.368, -279.5, 523).scale(scale).color(polymer));
p.part('base-carcass-1', box(567.6, 507, 750, true).translate(330, 0, 455).scale(scale).color(enamel));
p.part('base-door-1', box(522.192, 18, 715, true).translate(330, -260, 447.5).scale(scale).color(enamel));
p.part('door-pull-1', box(12, 18, 110, true).translate(511.632, -279.5, 523).scale(scale).color(polymer));
p.part('splashback', box(1500, 32, 250, true).translate(0, 299, 1150).scale(scale).color(enamel));

return p.model();
