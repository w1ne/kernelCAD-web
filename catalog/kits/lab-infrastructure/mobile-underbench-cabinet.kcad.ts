// SPDX-License-Identifier: CC0-1.0
// Compact rolling laboratory storage unit with two drawers, side pull and visible casters.
meta({
  name: 'mobile-underbench-cabinet',
  license: 'CC0-1.0',
  title: 'Mobile underbench cabinet',
  description: 'Compact rolling laboratory storage unit with two drawers, side pull and visible casters. Editable material controls: enamel coating, polymer controls, rubber and seals, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', rubber: '#484f52', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', rubber: '#202528', steel: '#33464d' },
});
const p = assembly('mobile-underbench-cabinet');
p.part('cabinet-shell', box(500, 520, 665, true).translate(0, 0, 387.5).scale(scale).color(enamel));
p.part('cabinet-plinth', box(460, 468, 77, true).translate(0, 0, 38.5).scale(scale).color(steel));
p.part('drawer-front-0-0', box(202.1, 18, 320.5, true).translate(-110, -265.2, 376.5).scale(scale).color(enamel));
p.part('drawer-pull-0-0', box(60.2, 12, 14, true).translate(-110, -286, 228.25).scale(scale).color(polymer));
p.part('drawer-front-0-1', box(202.1, 18, 320.5, true).translate(-110, -265.2, 709).scale(scale).color(enamel));
p.part('drawer-pull-0-1', box(60.2, 12, 14, true).translate(-110, -286, 560.75).scale(scale).color(polymer));
p.part('drawer-front-1-0', box(202.1, 18, 320.5, true).translate(110, -265.2, 376.5).scale(scale).color(enamel));
p.part('drawer-pull-1-0', box(60.2, 12, 14, true).translate(110, -286, 228.25).scale(scale).color(polymer));
p.part('drawer-front-1-1', box(202.1, 18, 320.5, true).translate(110, -265.2, 709).scale(scale).color(enamel));
p.part('drawer-pull-1-1', box(60.2, 12, 14, true).translate(110, -286, 560.75).scale(scale).color(polymer));
p.part('caster--190-0--197-6', cylinder(55, 34, 8).translate(-190, -197.6, 0).scale(scale).color(rubber));
p.part('caster--190-0-197-6', cylinder(55, 34, 8).translate(-190, 197.6, 0).scale(scale).color(rubber));
p.part('caster-190-0--197-6', cylinder(55, 34, 8).translate(190, -197.6, 0).scale(scale).color(rubber));
p.part('caster-190-0-197-6', cylinder(55, 34, 8).translate(190, 197.6, 0).scale(scale).color(rubber));

return p.model();
