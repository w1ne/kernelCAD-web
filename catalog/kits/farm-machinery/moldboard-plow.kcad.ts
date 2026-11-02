// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly moldboard plow scene prop, modeled from scratch.
meta({
  name: "moldboard-plow",
  license: 'CC0-1.0',
  title: "Moldboard plow",
  description: "Three-bottom moldboard plow with a heavy toolbar, curved-looking shares and gauge wheel. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('moldboard-plow');
const groundOffset = 40;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1650, 110, 94, true).translate(0, 126, 435.8), accent);
add('drawbar', box(135, 588, 70, true).translate(0, 451.5, 481.4), body);
add('standard-0', box(42, 58, 446.4, true).translate(-693, 0, 403.2), body);
add('moldboard-share-0', box(190, 250, 32, true).translate(-693, -126, 56), accent);
add('moldboard-wing-0', box(110, 160, 331.2, true).translate(-693, -231, 315.6), body);
add('standard-1', box(42, 58, 446.4, true).translate(0, 0, 403.2), body);
add('moldboard-share-1', box(190, 250, 32, true).translate(0, -126, 56), accent);
add('moldboard-wing-1', box(110, 160, 331.2, true).translate(0, -231, 315.6), body);
add('standard-2', box(42, 58, 446.4, true).translate(693, 0, 403.2), body);
add('moldboard-share-2', box(190, 250, 32, true).translate(693, -126, 56), accent);
add('moldboard-wing-2', box(110, 160, 331.2, true).translate(693, -231, 315.6), body);

return p.model();
