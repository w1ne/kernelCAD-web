// SPDX-License-Identifier: CC0-1.0
// Hygiene-zone bench with a divided clean-side seat, shoe shelf and stable tubular base.
meta({
  name: 'cleanroom-gowning-bench',
  license: 'CC0-1.0',
  title: 'Cleanroom gowning bench',
  description: 'Hygiene-zone bench with a divided clean-side seat, shoe shelf and stable tubular base. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('cleanroom-gowning-bench');
p.part('worktop', box(1200, 500, 32, true).translate(0, 0, 484).scale(scale).color(stainless));
p.part('leg-0--200-0', box(42, 42, 468, true).translate(-516, -200, 234).scale(scale).color(steel));
p.part('leg-0-200-0', box(42, 42, 468, true).translate(-516, 200, 234).scale(scale).color(steel));
p.part('leg-1--200-0', box(42, 42, 468, true).translate(-172, -200, 234).scale(scale).color(steel));
p.part('leg-1-200-0', box(42, 42, 468, true).translate(-172, 200, 234).scale(scale).color(steel));
p.part('leg-2--200-0', box(42, 42, 468, true).translate(172, -200, 234).scale(scale).color(steel));
p.part('leg-2-200-0', box(42, 42, 468, true).translate(172, 200, 234).scale(scale).color(steel));
p.part('leg-3--200-0', box(42, 42, 468, true).translate(516, -200, 234).scale(scale).color(steel));
p.part('leg-3-200-0', box(42, 42, 468, true).translate(516, 200, 234).scale(scale).color(steel));
p.part('lower-cross-rail', box(1032, 36, 28, true).translate(0, 0, 134).scale(scale).color(steel));
p.part('lower-shelf', box(984, 360, 24, true).translate(0, 0, 150).scale(scale).color(enamel));

return p.model();
