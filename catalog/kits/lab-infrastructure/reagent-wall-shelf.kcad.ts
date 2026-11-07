// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly reagent wall shelf scene prop, modeled from scratch.
meta({
  name: 'reagent-wall-shelf',
  license: 'CC0-1.0',
  title: 'Reagent wall shelf',
  description: 'Wall-mounted reagent shelf with a raised spill rail, support brackets and bottle stops. Knobs: overall scale, body color and accent color.',
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
const p = assembly('reagent-wall-shelf');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('upright--552-0--126-0', box(34, 34, 430, true).translate(-552, -126, 215), body);
add('upright--552-0-126-0', box(34, 34, 430, true).translate(-552, 126, 215), body);
add('upright-552-0--126-0', box(34, 34, 430, true).translate(552, -126, 215), body);
add('upright-552-0-126-0', box(34, 34, 430, true).translate(552, 126, 215), body);
add('shelf-deck-0', box(1176, 282, 28, true).translate(0, 0, 174), accent);
add('front-stop-0', box(1140, 18, 36, true).translate(0, -135, 208), body);
add('shelf-deck-1', box(1176, 282, 28, true).translate(0, 0, 314), accent);
add('front-stop-1', box(1140, 18, 36, true).translate(0, -135, 348), body);
add('reagent-bottle-0', cylinder(115, 25, 8).translate(-380, 0, 330), body);
add('bottle-cap-0', cylinder(22, 18, 8).translate(-380, 0, 445), accent);
add('reagent-bottle-1', cylinder(115, 25, 8).translate(-228, 0, 330), body);
add('bottle-cap-1', cylinder(22, 18, 8).translate(-228, 0, 445), accent);
add('reagent-bottle-2', cylinder(115, 25, 8).translate(-76, 0, 330), body);
add('bottle-cap-2', cylinder(22, 18, 8).translate(-76, 0, 445), accent);
add('reagent-bottle-3', cylinder(115, 25, 8).translate(76, 0, 330), body);
add('bottle-cap-3', cylinder(22, 18, 8).translate(76, 0, 445), accent);
add('reagent-bottle-4', cylinder(115, 25, 8).translate(228, 0, 330), body);
add('bottle-cap-4', cylinder(22, 18, 8).translate(228, 0, 445), accent);
add('reagent-bottle-5', cylinder(115, 25, 8).translate(380, 0, 330), body);
add('bottle-cap-5', cylinder(22, 18, 8).translate(380, 0, 445), accent);

return p.model();
