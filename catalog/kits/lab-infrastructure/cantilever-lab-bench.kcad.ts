// SPDX-License-Identifier: CC0-1.0
// Wall-supported cantilever bench with knee space, a thick work surface and service rail.
meta({
  name: 'cantilever-lab-bench',
  license: 'CC0-1.0',
  title: 'Cantilever laboratory bench',
  description: 'Wall-supported cantilever bench with knee space, a thick work surface and service rail. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cantilever-lab-bench');
p.part('worktop', box(1400, 650, 32, true).translate(0, 0, 884).scale(scale).color(stainless));
p.part('leg-0--260-0', box(42, 42, 868, true).translate(-602, -260, 434).scale(scale).color(steel));
p.part('leg-0-260-0', box(42, 42, 868, true).translate(-602, 260, 434).scale(scale).color(steel));
p.part('leg-1--260-0', box(42, 42, 868, true).translate(-200.667, -260, 434).scale(scale).color(steel));
p.part('leg-1-260-0', box(42, 42, 868, true).translate(-200.667, 260, 434).scale(scale).color(steel));
p.part('leg-2--260-0', box(42, 42, 868, true).translate(200.667, -260, 434).scale(scale).color(steel));
p.part('leg-2-260-0', box(42, 42, 868, true).translate(200.667, 260, 434).scale(scale).color(steel));
p.part('leg-3--260-0', box(42, 42, 868, true).translate(602, -260, 434).scale(scale).color(steel));
p.part('leg-3-260-0', box(42, 42, 868, true).translate(602, 260, 434).scale(scale).color(steel));
p.part('lower-cross-rail', box(1204, 36, 28, true).translate(0, 0, 230).scale(scale).color(steel));
p.part('wall-bracket--532-0', box(28, 520, 40, true).translate(-532, 273, 542).scale(scale).color(steel));
p.part('wall-bracket-532-0', box(28, 520, 40, true).translate(532, 273, 542).scale(scale).color(steel));
p.part('splashback', box(1400, 32, 250, true).translate(0, 299, 1150).scale(scale).color(enamel));

return p.model();
