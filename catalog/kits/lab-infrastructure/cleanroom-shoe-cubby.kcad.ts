// SPDX-License-Identifier: CC0-1.0
// Low footwear rack with six divided cubbies, raised feet and a wipe-clean top.
meta({
  name: 'cleanroom-shoe-cubby',
  license: 'CC0-1.0',
  title: 'Cleanroom shoe cubby rack',
  description: 'Low footwear rack with six divided cubbies, raised feet and a wipe-clean top. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cleanroom-shoe-cubby');
p.part('upright--552-0--180-6', box(34, 34, 620, true).translate(-552, -180.6, 310).scale(scale).color(steel));
p.part('upright--552-0-180-6', box(34, 34, 620, true).translate(-552, 180.6, 310).scale(scale).color(steel));
p.part('upright-552-0--180-6', box(34, 34, 620, true).translate(552, -180.6, 310).scale(scale).color(steel));
p.part('upright-552-0-180-6', box(34, 34, 620, true).translate(552, 180.6, 310).scale(scale).color(steel));
p.part('shelf-deck-0', box(1176, 404.2, 28, true).translate(0, 0, 221.5).scale(scale).color(stainless));
p.part('front-stop-0', box(1140, 18, 36, true).translate(0, -193.5, 255.5).scale(scale).color(enamel));
p.part('shelf-deck-1', box(1176, 404.2, 28, true).translate(0, 0, 456.5).scale(scale).color(stainless));
p.part('front-stop-1', box(1140, 18, 36, true).translate(0, -193.5, 490.5).scale(scale).color(enamel));
p.part('divider-1', box(16, 387, 620, true).translate(-376, 0, 310).scale(scale).color(enamel));
p.part('divider-2', box(16, 387, 620, true).translate(-176, 0, 310).scale(scale).color(enamel));
p.part('divider-3', box(16, 387, 620, true).translate(24, 0, 310).scale(scale).color(enamel));
p.part('divider-4', box(16, 387, 620, true).translate(224, 0, 310).scale(scale).color(enamel));
p.part('divider-5', box(16, 387, 620, true).translate(424, 0, 310).scale(scale).color(enamel));

return p.model();
