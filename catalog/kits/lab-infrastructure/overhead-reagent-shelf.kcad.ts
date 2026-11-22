// SPDX-License-Identifier: CC0-1.0
// Bench-top overhead shelf with twin posts, a broad tray and a lower service ledge.
meta({
  name: 'overhead-reagent-shelf',
  license: 'CC0-1.0',
  title: 'Overhead reagent shelf',
  description: 'Bench-top overhead shelf with twin posts, a broad tray and a lower service ledge. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('overhead-reagent-shelf');
p.part('upright--598-0--147-0', box(34, 34, 850, true).translate(-598, -147, 425).scale(scale).color(enamel));
p.part('upright--598-0-147-0', box(34, 34, 850, true).translate(-598, 147, 425).scale(scale).color(enamel));
p.part('upright-598-0--147-0', box(34, 34, 850, true).translate(598, -147, 425).scale(scale).color(enamel));
p.part('upright-598-0-147-0', box(34, 34, 850, true).translate(598, 147, 425).scale(scale).color(enamel));
p.part('shelf-deck-0', box(1274, 329, 28, true).translate(0, 0, 279).scale(scale).color(stainless));
p.part('front-stop-0', box(1235, 18, 36, true).translate(0, -157.5, 313).scale(scale).color(enamel));
p.part('shelf-deck-1', box(1274, 329, 28, true).translate(0, 0, 629).scale(scale).color(stainless));
p.part('front-stop-1', box(1235, 18, 36, true).translate(0, -157.5, 663).scale(scale).color(enamel));
p.part('reagent-bottle-0', cylinder(115, 25, 8).translate(-370.5, 0, 645).scale(scale).color(glass));
p.part('bottle-cap-0', cylinder(22, 18, 8).translate(-370.5, 0, 760).scale(scale).color(polymer));
p.part('reagent-bottle-1', cylinder(115, 25, 8).translate(-123.5, 0, 645).scale(scale).color(glass));
p.part('bottle-cap-1', cylinder(22, 18, 8).translate(-123.5, 0, 760).scale(scale).color(polymer));
p.part('reagent-bottle-2', cylinder(115, 25, 8).translate(123.5, 0, 645).scale(scale).color(glass));
p.part('bottle-cap-2', cylinder(22, 18, 8).translate(123.5, 0, 760).scale(scale).color(polymer));
p.part('reagent-bottle-3', cylinder(115, 25, 8).translate(370.5, 0, 645).scale(scale).color(glass));
p.part('bottle-cap-3', cylinder(22, 18, 8).translate(370.5, 0, 760).scale(scale).color(polymer));

return p.model();
