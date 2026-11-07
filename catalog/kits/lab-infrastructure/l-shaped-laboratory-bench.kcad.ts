// SPDX-License-Identifier: CC0-1.0
// Corner laboratory bench with a return worktop, underbench storage and a raised end panel.
meta({
  name: 'l-shaped-laboratory-bench',
  license: 'CC0-1.0',
  title: 'L-shaped laboratory bench',
  description: 'Corner laboratory bench with a return worktop, underbench storage and a raised end panel. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('l-shaped-laboratory-bench');
p.part('long-top', box(1400, 620, 34, true).translate(0, 0, 883).scale(scale).color(stainless));
p.part('return-top', box(900, 620, 34, true).translate(616, 260.4, 883).scale(scale).color(stainless));
p.part('leg--588-0--248-0', box(42, 42, 866, true).translate(-588, -248, 433).scale(scale).color(steel));
p.part('leg--588-0-248-0', box(42, 42, 866, true).translate(-588, 248, 433).scale(scale).color(steel));
p.part('leg-588-0--248-0', box(42, 42, 866, true).translate(588, -248, 433).scale(scale).color(steel));
p.part('leg-588-0-248-0', box(42, 42, 866, true).translate(588, 248, 433).scale(scale).color(steel));
p.part('return-cabinet-0', box(350, 471.2, 760, true).translate(-392, 0, 450).scale(scale).color(enamel));
p.part('return-door-0', box(322, 18, 710, true).translate(-392, -241.8, 445).scale(scale).color(enamel));
p.part('return-cabinet-1', box(350, 471.2, 760, true).translate(392, 0, 450).scale(scale).color(enamel));
p.part('return-door-1', box(322, 18, 710, true).translate(392, -241.8, 445).scale(scale).color(enamel));
p.part('end-splash', box(34, 620, 210, true).translate(658, 279, 1110).scale(scale).color(enamel));

return p.model();
