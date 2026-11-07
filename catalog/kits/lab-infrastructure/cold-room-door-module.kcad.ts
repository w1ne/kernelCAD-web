// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cold-room door module scene prop, modeled from scratch.
meta({
  name: 'cold-room-door-module',
  license: 'CC0-1.0',
  title: 'Cold-room door module',
  description: 'Insulated walk-in cold-room door with thick frame, exterior pull and protective kick plate. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cold-room-door-module');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('outer-frame-left', box(85, 150, 2200, true).translate(-504, 0, 1100), accent);
add('outer-frame-right', box(85, 150, 2200, true).translate(504, 0, 1100), accent);
add('header', box(1200, 150, 160, true).translate(0, 0, 2200), accent);
add('door-leaf', box(744, 97.5, 1936, true).translate(0, -18, 2024), body);
add('door-vision-panel', box(360, 18, 484, true).translate(0, -72, 1738), accent);
add('door-push-plate', box(40, 12, 170, true).translate(252, -78, 1075), accent);

return p.model();
