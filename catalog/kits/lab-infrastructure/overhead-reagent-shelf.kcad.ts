// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly overhead reagent shelf scene prop, modeled from scratch.
meta({
  name: 'overhead-reagent-shelf',
  license: 'CC0-1.0',
  title: 'Overhead reagent shelf',
  description: 'Bench-top overhead shelf with twin posts, a broad tray and a lower service ledge. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('overhead-reagent-shelf');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('upright--598-0--147-0', box(34, 34, 850, true).translate(-598, -147, 425), body);
add('upright--598-0-147-0', box(34, 34, 850, true).translate(-598, 147, 425), body);
add('upright-598-0--147-0', box(34, 34, 850, true).translate(598, -147, 425), body);
add('upright-598-0-147-0', box(34, 34, 850, true).translate(598, 147, 425), body);
add('shelf-deck-0', box(1274, 329, 28, true).translate(0, 0, 279), accent);
add('front-stop-0', box(1235, 18, 36, true).translate(0, -157.5, 313), body);
add('shelf-deck-1', box(1274, 329, 28, true).translate(0, 0, 629), accent);
add('front-stop-1', box(1235, 18, 36, true).translate(0, -157.5, 663), body);
add('reagent-bottle-0', cylinder(115, 25, 8).translate(-370.5, 0, 645), body);
add('bottle-cap-0', cylinder(22, 18, 8).translate(-370.5, 0, 760), accent);
add('reagent-bottle-1', cylinder(115, 25, 8).translate(-123.5, 0, 645), body);
add('bottle-cap-1', cylinder(22, 18, 8).translate(-123.5, 0, 760), accent);
add('reagent-bottle-2', cylinder(115, 25, 8).translate(123.5, 0, 645), body);
add('bottle-cap-2', cylinder(22, 18, 8).translate(123.5, 0, 760), accent);
add('reagent-bottle-3', cylinder(115, 25, 8).translate(370.5, 0, 645), body);
add('bottle-cap-3', cylinder(22, 18, 8).translate(370.5, 0, 760), accent);

return p.model();
