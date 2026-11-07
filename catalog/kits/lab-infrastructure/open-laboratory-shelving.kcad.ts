// SPDX-License-Identifier: CC0-1.0
// Freestanding storage frame with five adjustable-looking shelves and cross-braced uprights.
meta({
  name: 'open-laboratory-shelving',
  license: 'CC0-1.0',
  title: 'Open laboratory shelving',
  description: 'Freestanding storage frame with five adjustable-looking shelves and cross-braced uprights. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('open-laboratory-shelving');
p.part('upright--506-0--218-4', box(34, 34, 1900, true).translate(-506, -218.4, 950).scale(scale).color(steel));
p.part('upright--506-0-218-4', box(34, 34, 1900, true).translate(-506, 218.4, 950).scale(scale).color(steel));
p.part('upright-506-0--218-4', box(34, 34, 1900, true).translate(506, -218.4, 950).scale(scale).color(steel));
p.part('upright-506-0-218-4', box(34, 34, 1900, true).translate(506, 218.4, 950).scale(scale).color(steel));
p.part('shelf-deck-0', box(1078, 488.8, 28, true).translate(0, 0, 279).scale(scale).color(stainless));
p.part('front-stop-0', box(1045, 18, 36, true).translate(0, -234, 313).scale(scale).color(enamel));
p.part('shelf-deck-1', box(1078, 488.8, 28, true).translate(0, 0, 629).scale(scale).color(stainless));
p.part('front-stop-1', box(1045, 18, 36, true).translate(0, -234, 663).scale(scale).color(enamel));
p.part('shelf-deck-2', box(1078, 488.8, 28, true).translate(0, 0, 979).scale(scale).color(stainless));
p.part('front-stop-2', box(1045, 18, 36, true).translate(0, -234, 1013).scale(scale).color(enamel));
p.part('shelf-deck-3', box(1078, 488.8, 28, true).translate(0, 0, 1329).scale(scale).color(stainless));
p.part('front-stop-3', box(1045, 18, 36, true).translate(0, -234, 1363).scale(scale).color(enamel));
p.part('shelf-deck-4', box(1078, 488.8, 28, true).translate(0, 0, 1679).scale(scale).color(stainless));
p.part('front-stop-4', box(1045, 18, 36, true).translate(0, -234, 1713).scale(scale).color(enamel));
p.part('rear-brace--1', box(880, 22, 24, true).translate(0, 208, 962).scale(scale).color(steel));
p.part('rear-brace-1', box(880, 22, 24, true).translate(0, 208, 962).scale(scale).color(steel));

return p.model();
