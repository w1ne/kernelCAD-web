// SPDX-License-Identifier: CC0-1.0
// Wall-mounted reagent shelf with a raised spill rail, support brackets and bottle stops.
meta({
  name: 'reagent-wall-shelf',
  license: 'CC0-1.0',
  title: 'Reagent wall shelf',
  description: 'Wall-mounted reagent shelf with a raised spill rail, support brackets and bottle stops. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const glass = param('glass', '#55b7ca', { label: 'Tinted safety glass' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('reagent-wall-shelf');
p.part('upright--552-0--126-0', box(34, 34, 430, true).translate(-552, -126, 215).scale(scale).color(enamel));
p.part('upright--552-0-126-0', box(34, 34, 430, true).translate(-552, 126, 215).scale(scale).color(enamel));
p.part('upright-552-0--126-0', box(34, 34, 430, true).translate(552, -126, 215).scale(scale).color(enamel));
p.part('upright-552-0-126-0', box(34, 34, 430, true).translate(552, 126, 215).scale(scale).color(enamel));
p.part('shelf-deck-0', box(1176, 282, 28, true).translate(0, 0, 174).scale(scale).color(stainless));
p.part('front-stop-0', box(1140, 18, 36, true).translate(0, -135, 208).scale(scale).color(enamel));
p.part('shelf-deck-1', box(1176, 282, 28, true).translate(0, 0, 314).scale(scale).color(stainless));
p.part('front-stop-1', box(1140, 18, 36, true).translate(0, -135, 348).scale(scale).color(enamel));
p.part('reagent-bottle-0', cylinder(115, 25, 8).translate(-380, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-0', cylinder(22, 18, 8).translate(-380, 0, 445).scale(scale).color(polymer));
p.part('reagent-bottle-1', cylinder(115, 25, 8).translate(-228, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-1', cylinder(22, 18, 8).translate(-228, 0, 445).scale(scale).color(polymer));
p.part('reagent-bottle-2', cylinder(115, 25, 8).translate(-76, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-2', cylinder(22, 18, 8).translate(-76, 0, 445).scale(scale).color(polymer));
p.part('reagent-bottle-3', cylinder(115, 25, 8).translate(76, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-3', cylinder(22, 18, 8).translate(76, 0, 445).scale(scale).color(polymer));
p.part('reagent-bottle-4', cylinder(115, 25, 8).translate(228, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-4', cylinder(22, 18, 8).translate(228, 0, 445).scale(scale).color(polymer));
p.part('reagent-bottle-5', cylinder(115, 25, 8).translate(380, 0, 330).scale(scale).color(glass));
p.part('bottle-cap-5', cylinder(22, 18, 8).translate(380, 0, 445).scale(scale).color(polymer));

return p.model();
