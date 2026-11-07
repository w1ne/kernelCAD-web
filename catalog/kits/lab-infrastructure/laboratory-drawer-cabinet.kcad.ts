// SPDX-License-Identifier: CC0-1.0
// Underbench drawer unit with four stacked fronts, label slots and a protective top.
meta({
  name: 'laboratory-drawer-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory drawer cabinet',
  description: 'Underbench drawer unit with four stacked fronts, label slots and a protective top. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', steel: '#33464d' },
});
const p = assembly('laboratory-drawer-cabinet');
p.part('cabinet-shell', box(600, 570, 820, true).translate(0, 0, 410).scale(scale).color(enamel));
p.part('cabinet-plinth', box(552, 513, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('drawer-front-0-0', box(121.26, 18, 193, true).translate(-198, -290.7, 194).scale(scale).color(enamel));
p.part('drawer-pull-0-0', box(36.12, 12, 14, true).translate(-198, -313.5, 109.5).scale(scale).color(polymer));
p.part('drawer-front-0-1', box(121.26, 18, 193, true).translate(-198, -290.7, 399).scale(scale).color(enamel));
p.part('drawer-pull-0-1', box(36.12, 12, 14, true).translate(-198, -313.5, 314.5).scale(scale).color(polymer));
p.part('drawer-front-0-2', box(121.26, 18, 193, true).translate(-198, -290.7, 604).scale(scale).color(enamel));
p.part('drawer-pull-0-2', box(36.12, 12, 14, true).translate(-198, -313.5, 519.5).scale(scale).color(polymer));
p.part('drawer-front-0-3', box(121.26, 18, 193, true).translate(-198, -290.7, 809).scale(scale).color(enamel));
p.part('drawer-pull-0-3', box(36.12, 12, 14, true).translate(-198, -313.5, 724.5).scale(scale).color(polymer));
p.part('drawer-front-1-0', box(121.26, 18, 193, true).translate(-66, -290.7, 194).scale(scale).color(enamel));
p.part('drawer-pull-1-0', box(36.12, 12, 14, true).translate(-66, -313.5, 109.5).scale(scale).color(polymer));
p.part('drawer-front-1-1', box(121.26, 18, 193, true).translate(-66, -290.7, 399).scale(scale).color(enamel));
p.part('drawer-pull-1-1', box(36.12, 12, 14, true).translate(-66, -313.5, 314.5).scale(scale).color(polymer));
p.part('drawer-front-1-2', box(121.26, 18, 193, true).translate(-66, -290.7, 604).scale(scale).color(enamel));
p.part('drawer-pull-1-2', box(36.12, 12, 14, true).translate(-66, -313.5, 519.5).scale(scale).color(polymer));
p.part('drawer-front-1-3', box(121.26, 18, 193, true).translate(-66, -290.7, 809).scale(scale).color(enamel));
p.part('drawer-pull-1-3', box(36.12, 12, 14, true).translate(-66, -313.5, 724.5).scale(scale).color(polymer));
p.part('drawer-front-2-0', box(121.26, 18, 193, true).translate(66, -290.7, 194).scale(scale).color(enamel));
p.part('drawer-pull-2-0', box(36.12, 12, 14, true).translate(66, -313.5, 109.5).scale(scale).color(polymer));
p.part('drawer-front-2-1', box(121.26, 18, 193, true).translate(66, -290.7, 399).scale(scale).color(enamel));
p.part('drawer-pull-2-1', box(36.12, 12, 14, true).translate(66, -313.5, 314.5).scale(scale).color(polymer));
p.part('drawer-front-2-2', box(121.26, 18, 193, true).translate(66, -290.7, 604).scale(scale).color(enamel));
p.part('drawer-pull-2-2', box(36.12, 12, 14, true).translate(66, -313.5, 519.5).scale(scale).color(polymer));
p.part('drawer-front-2-3', box(121.26, 18, 193, true).translate(66, -290.7, 809).scale(scale).color(enamel));
p.part('drawer-pull-2-3', box(36.12, 12, 14, true).translate(66, -313.5, 724.5).scale(scale).color(polymer));
p.part('drawer-front-3-0', box(121.26, 18, 193, true).translate(198, -290.7, 194).scale(scale).color(enamel));
p.part('drawer-pull-3-0', box(36.12, 12, 14, true).translate(198, -313.5, 109.5).scale(scale).color(polymer));
p.part('drawer-front-3-1', box(121.26, 18, 193, true).translate(198, -290.7, 399).scale(scale).color(enamel));
p.part('drawer-pull-3-1', box(36.12, 12, 14, true).translate(198, -313.5, 314.5).scale(scale).color(polymer));
p.part('drawer-front-3-2', box(121.26, 18, 193, true).translate(198, -290.7, 604).scale(scale).color(enamel));
p.part('drawer-pull-3-2', box(36.12, 12, 14, true).translate(198, -313.5, 519.5).scale(scale).color(polymer));
p.part('drawer-front-3-3', box(121.26, 18, 193, true).translate(198, -290.7, 809).scale(scale).color(enamel));
p.part('drawer-pull-3-3', box(36.12, 12, 14, true).translate(198, -313.5, 724.5).scale(scale).color(polymer));

return p.model();
