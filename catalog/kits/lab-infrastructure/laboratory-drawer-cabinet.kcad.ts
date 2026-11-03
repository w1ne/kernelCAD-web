// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory drawer cabinet scene prop, modeled from scratch.
meta({
  name: 'laboratory-drawer-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory drawer cabinet',
  description: 'Underbench drawer unit with four stacked fronts, label slots and a protective top. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-drawer-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(600, 570, 820, true).translate(0, 0, 410), body);
add('cabinet-plinth', box(552, 513, 22, true).translate(0, 0, 11), accent);
add('drawer-front-0-0', box(121.26, 18, 193, true).translate(-198, -290.7, 194), accent);
add('drawer-pull-0-0', box(36.12, 12, 14, true).translate(-198, -313.5, 109.5), body);
add('drawer-front-0-1', box(121.26, 18, 193, true).translate(-198, -290.7, 399), body);
add('drawer-pull-0-1', box(36.12, 12, 14, true).translate(-198, -313.5, 314.5), body);
add('drawer-front-0-2', box(121.26, 18, 193, true).translate(-198, -290.7, 604), accent);
add('drawer-pull-0-2', box(36.12, 12, 14, true).translate(-198, -313.5, 519.5), body);
add('drawer-front-0-3', box(121.26, 18, 193, true).translate(-198, -290.7, 809), body);
add('drawer-pull-0-3', box(36.12, 12, 14, true).translate(-198, -313.5, 724.5), body);
add('drawer-front-1-0', box(121.26, 18, 193, true).translate(-66, -290.7, 194), accent);
add('drawer-pull-1-0', box(36.12, 12, 14, true).translate(-66, -313.5, 109.5), body);
add('drawer-front-1-1', box(121.26, 18, 193, true).translate(-66, -290.7, 399), body);
add('drawer-pull-1-1', box(36.12, 12, 14, true).translate(-66, -313.5, 314.5), body);
add('drawer-front-1-2', box(121.26, 18, 193, true).translate(-66, -290.7, 604), accent);
add('drawer-pull-1-2', box(36.12, 12, 14, true).translate(-66, -313.5, 519.5), body);
add('drawer-front-1-3', box(121.26, 18, 193, true).translate(-66, -290.7, 809), body);
add('drawer-pull-1-3', box(36.12, 12, 14, true).translate(-66, -313.5, 724.5), body);
add('drawer-front-2-0', box(121.26, 18, 193, true).translate(66, -290.7, 194), accent);
add('drawer-pull-2-0', box(36.12, 12, 14, true).translate(66, -313.5, 109.5), body);
add('drawer-front-2-1', box(121.26, 18, 193, true).translate(66, -290.7, 399), body);
add('drawer-pull-2-1', box(36.12, 12, 14, true).translate(66, -313.5, 314.5), body);
add('drawer-front-2-2', box(121.26, 18, 193, true).translate(66, -290.7, 604), accent);
add('drawer-pull-2-2', box(36.12, 12, 14, true).translate(66, -313.5, 519.5), body);
add('drawer-front-2-3', box(121.26, 18, 193, true).translate(66, -290.7, 809), body);
add('drawer-pull-2-3', box(36.12, 12, 14, true).translate(66, -313.5, 724.5), body);
add('drawer-front-3-0', box(121.26, 18, 193, true).translate(198, -290.7, 194), accent);
add('drawer-pull-3-0', box(36.12, 12, 14, true).translate(198, -313.5, 109.5), body);
add('drawer-front-3-1', box(121.26, 18, 193, true).translate(198, -290.7, 399), body);
add('drawer-pull-3-1', box(36.12, 12, 14, true).translate(198, -313.5, 314.5), body);
add('drawer-front-3-2', box(121.26, 18, 193, true).translate(198, -290.7, 604), accent);
add('drawer-pull-3-2', box(36.12, 12, 14, true).translate(198, -313.5, 519.5), body);
add('drawer-front-3-3', box(121.26, 18, 193, true).translate(198, -290.7, 809), body);
add('drawer-pull-3-3', box(36.12, 12, 14, true).translate(198, -313.5, 724.5), body);

return p.model();
