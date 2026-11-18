// SPDX-License-Identifier: CC0-1.0
// Compact weighing station with a heavy isolated stone slab, rigid frame and lower shelf.
meta({
  name: 'balance-isolation-bench',
  license: 'CC0-1.0',
  title: 'Balance isolation bench',
  description: 'Compact weighing station with a heavy isolated stone slab, rigid frame and lower shelf. Editable material controls: enamel coating, rubber and seals, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const rubber = param('rubber', '#30363a', { label: 'Rubber and seals' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', rubber: '#484f52', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', rubber: '#202528', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('balance-isolation-bench');
p.part('worktop', box(850, 650, 36, true).translate(0, 0, 832).scale(scale).color(stainless));
p.part('leg-0--260-0', box(42, 42, 814, true).translate(-365.5, -260, 407).scale(scale).color(steel));
p.part('leg-0-260-0', box(42, 42, 814, true).translate(-365.5, 260, 407).scale(scale).color(steel));
p.part('leg-1--260-0', box(42, 42, 814, true).translate(-121.833, -260, 407).scale(scale).color(steel));
p.part('leg-1-260-0', box(42, 42, 814, true).translate(-121.833, 260, 407).scale(scale).color(steel));
p.part('leg-2--260-0', box(42, 42, 814, true).translate(121.833, -260, 407).scale(scale).color(steel));
p.part('leg-2-260-0', box(42, 42, 814, true).translate(121.833, 260, 407).scale(scale).color(steel));
p.part('leg-3--260-0', box(42, 42, 814, true).translate(365.5, -260, 407).scale(scale).color(steel));
p.part('leg-3-260-0', box(42, 42, 814, true).translate(365.5, 260, 407).scale(scale).color(steel));
p.part('lower-cross-rail', box(731, 36, 28, true).translate(0, 0, 218).scale(scale).color(steel));
p.part('lower-shelf', box(697, 468, 24, true).translate(0, 0, 234).scale(scale).color(enamel));

p.part('foot-pad-0', cylinder(40, 24, 8).translate(-365.5, -260, 0).scale(scale).color(rubber));
p.part('foot-pad-1', cylinder(40, 24, 8).translate(-365.5, 260, 0).scale(scale).color(rubber));
p.part('foot-pad-2', cylinder(40, 24, 8).translate(-121.833, -260, 0).scale(scale).color(rubber));
p.part('foot-pad-3', cylinder(40, 24, 8).translate(-121.833, 260, 0).scale(scale).color(rubber));
p.part('foot-pad-4', cylinder(40, 24, 8).translate(121.833, -260, 0).scale(scale).color(rubber));
p.part('foot-pad-5', cylinder(40, 24, 8).translate(121.833, 260, 0).scale(scale).color(rubber));
p.part('foot-pad-6', cylinder(40, 24, 8).translate(365.5, -260, 0).scale(scale).color(rubber));
p.part('foot-pad-7', cylinder(40, 24, 8).translate(365.5, 260, 0).scale(scale).color(rubber));
return p.model();
