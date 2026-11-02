// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom single-door module scene prop, modeled from scratch.
meta({
  name: 'cleanroom-single-door-module',
  license: 'CC0-1.0',
  title: 'Cleanroom single-door module',
  description: 'Cleanroom doorway assembly with a flush door leaf, side frame and overhead header. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('cleanroom-single-door-module');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('outer-frame-left', box(85, 120, 2400, true).translate(-546, 0, 1200), accent);
add('outer-frame-right', box(85, 120, 2400, true).translate(546, 0, 1200), accent);
add('header', box(1300, 120, 160, true).translate(0, 0, 2400), accent);
add('door-leaf', box(806, 78, 2112, true).translate(0, -14.4, 2208), body);
add('door-vision-panel', box(390, 18, 528, true).translate(0, -57.6, 1896), accent);
add('door-push-plate', box(40, 12, 170, true).translate(273, -62.4, 1165), accent);

return p.model();
