// SPDX-License-Identifier: CC0-1.0
// Open stainless-style workbench with a raised rear rail, tubular legs and lower wire shelf.
meta({
  name: 'stainless-lab-bench',
  license: 'CC0-1.0',
  title: 'Stainless laboratory bench',
  description: 'Open stainless-style workbench with a raised rear rail, tubular legs and lower wire shelf. Editable material controls: stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('stainless-lab-bench');
p.part('worktop', box(1600, 700, 32, true).translate(0, 0, 884).scale(scale).color(stainless));
p.part('leg-0--280-0', box(42, 42, 868, true).translate(-688, -280, 434).scale(scale).color(steel));
p.part('leg-0-280-0', box(42, 42, 868, true).translate(-688, 280, 434).scale(scale).color(steel));
p.part('leg-1--280-0', box(42, 42, 868, true).translate(-412.8, -280, 434).scale(scale).color(steel));
p.part('leg-1-280-0', box(42, 42, 868, true).translate(-412.8, 280, 434).scale(scale).color(steel));
p.part('leg-2--280-0', box(42, 42, 868, true).translate(-137.6, -280, 434).scale(scale).color(steel));
p.part('leg-2-280-0', box(42, 42, 868, true).translate(-137.6, 280, 434).scale(scale).color(steel));
p.part('leg-3--280-0', box(42, 42, 868, true).translate(137.6, -280, 434).scale(scale).color(steel));
p.part('leg-3-280-0', box(42, 42, 868, true).translate(137.6, 280, 434).scale(scale).color(steel));
p.part('leg-4--280-0', box(42, 42, 868, true).translate(412.8, -280, 434).scale(scale).color(steel));
p.part('leg-4-280-0', box(42, 42, 868, true).translate(412.8, 280, 434).scale(scale).color(steel));
p.part('leg-5--280-0', box(42, 42, 868, true).translate(688, -280, 434).scale(scale).color(steel));
p.part('leg-5-280-0', box(42, 42, 868, true).translate(688, 280, 434).scale(scale).color(steel));
p.part('lower-cross-rail', box(1376, 36, 28, true).translate(0, 0, 230).scale(scale).color(steel));
p.part('lower-shelf', box(1312, 504, 24, true).translate(0, 0, 246).scale(scale).color(stainless));
p.part('splashback', box(1600, 32, 250, true).translate(0, 322, 1150).scale(scale).color(stainless));

return p.model();
