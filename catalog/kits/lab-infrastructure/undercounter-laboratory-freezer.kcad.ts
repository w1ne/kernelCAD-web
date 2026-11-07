// SPDX-License-Identifier: CC0-1.0
// Compact underbench cold-storage cabinet with an insulated door, toe kick and controller.
meta({
  name: 'undercounter-laboratory-freezer',
  license: 'CC0-1.0',
  title: 'Undercounter laboratory freezer',
  description: 'Compact underbench cold-storage cabinet with an insulated door, toe kick and controller. Editable material controls: enamel coating, polymer controls, rubber and seals, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('undercounter-laboratory-freezer');
p.part('insulated-cabinet', box(700, 700, 818, true).translate(0, 0, 441).scale(scale).color(enamel));
p.part('toe-kick', box(644, 602, 64, true).translate(0, 0, 32).scale(scale).color(enamel));
p.part('insulated-door-0', box(616, 30, 739.5, true).translate(0, -371, 811.75).scale(scale).color(enamel));
p.part('latch-0', box(32, 22, 212.5, true).translate(210, -413, 599.25).scale(scale).color(polymer));
p.part('controller', box(140, 24, 110, true).translate(238, -406, 752).scale(scale).color(polymer));
p.part('vent-0', box(44, 10, 14, true).translate(-210, -385, 107).scale(scale).color(enamel));
p.part('vent-1', box(44, 10, 14, true).translate(-105, -385, 131).scale(scale).color(enamel));
p.part('vent-2', box(44, 10, 14, true).translate(0, -385, 107).scale(scale).color(enamel));
p.part('vent-3', box(44, 10, 14, true).translate(105, -385, 131).scale(scale).color(enamel));
p.part('vent-4', box(44, 10, 14, true).translate(210, -385, 107).scale(scale).color(enamel));
p.part('compressor-grille', box(434, 24, 170, true).translate(0, 364, 238).scale(scale).color(stainless));

// Four narrow rubber seal strips frame the insulated door leaf.
p.part('door-seal-left', box(18, 12, 663, true).translate(-271, -385, 773.5).scale(scale).color(rubber));
p.part('door-seal-right', box(18, 12, 663, true).translate(271, -385, 773.5).scale(scale).color(rubber));
p.part('door-seal-top', box(540, 12, 18, true).translate(0, -385, 1096).scale(scale).color(rubber));
p.part('door-seal-bottom', box(540, 12, 18, true).translate(0, -385, 451).scale(scale).color(rubber));
return p.model();
