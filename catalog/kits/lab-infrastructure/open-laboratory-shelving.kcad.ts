// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly open laboratory shelving scene prop, modeled from scratch.
meta({
  name: 'open-laboratory-shelving',
  license: 'CC0-1.0',
  title: 'Open laboratory shelving',
  description: 'Freestanding storage frame with five adjustable-looking shelves and cross-braced uprights. Knobs: overall scale, body color and accent color.',
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
const p = assembly('open-laboratory-shelving');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('upright--506-0--218-4', box(34, 34, 1900, true).translate(-506, -218.4, 950), body);
add('upright--506-0-218-4', box(34, 34, 1900, true).translate(-506, 218.4, 950), body);
add('upright-506-0--218-4', box(34, 34, 1900, true).translate(506, -218.4, 950), body);
add('upright-506-0-218-4', box(34, 34, 1900, true).translate(506, 218.4, 950), body);
add('shelf-deck-0', box(1078, 488.8, 28, true).translate(0, 0, 279), accent);
add('front-stop-0', box(1045, 18, 36, true).translate(0, -234, 313), body);
add('shelf-deck-1', box(1078, 488.8, 28, true).translate(0, 0, 629), accent);
add('front-stop-1', box(1045, 18, 36, true).translate(0, -234, 663), body);
add('shelf-deck-2', box(1078, 488.8, 28, true).translate(0, 0, 979), accent);
add('front-stop-2', box(1045, 18, 36, true).translate(0, -234, 1013), body);
add('shelf-deck-3', box(1078, 488.8, 28, true).translate(0, 0, 1329), accent);
add('front-stop-3', box(1045, 18, 36, true).translate(0, -234, 1363), body);
add('shelf-deck-4', box(1078, 488.8, 28, true).translate(0, 0, 1679), accent);
add('front-stop-4', box(1045, 18, 36, true).translate(0, -234, 1713), body);
add('rear-brace--1', box(880, 22, 24, true).translate(0, 208, 962), accent);
add('rear-brace-1', box(880, 22, 24, true).translate(0, 208, 962), accent);

return p.model();
