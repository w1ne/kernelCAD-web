// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom shoe cubby rack scene prop, modeled from scratch.
meta({
  name: 'cleanroom-shoe-cubby',
  license: 'CC0-1.0',
  title: 'Cleanroom shoe cubby rack',
  description: 'Low footwear rack with six divided cubbies, raised feet and a wipe-clean top. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-shoe-cubby');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('upright--552-0--180-6', box(34, 34, 620, true).translate(-552, -180.6, 310), body);
add('upright--552-0-180-6', box(34, 34, 620, true).translate(-552, 180.6, 310), body);
add('upright-552-0--180-6', box(34, 34, 620, true).translate(552, -180.6, 310), body);
add('upright-552-0-180-6', box(34, 34, 620, true).translate(552, 180.6, 310), body);
add('shelf-deck-0', box(1176, 404.2, 28, true).translate(0, 0, 221.5), accent);
add('front-stop-0', box(1140, 18, 36, true).translate(0, -193.5, 255.5), body);
add('shelf-deck-1', box(1176, 404.2, 28, true).translate(0, 0, 456.5), accent);
add('front-stop-1', box(1140, 18, 36, true).translate(0, -193.5, 490.5), body);
add('divider-1', box(16, 387, 620, true).translate(-376, 0, 310), body);
add('divider-2', box(16, 387, 620, true).translate(-176, 0, 310), body);
add('divider-3', box(16, 387, 620, true).translate(24, 0, 310), body);
add('divider-4', box(16, 387, 620, true).translate(224, 0, 310), body);
add('divider-5', box(16, 387, 620, true).translate(424, 0, 310), body);

return p.model();
