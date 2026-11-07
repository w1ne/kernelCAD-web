// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory floor-drain trough scene prop, modeled from scratch.
meta({
  name: 'laboratory-floor-drain-trough',
  license: 'CC0-1.0',
  title: 'Laboratory floor-drain trough',
  description: 'Long floor trough with a grated top, end outlet and raised cleaning rim. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-floor-drain-trough');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('drain-trough', box(1200, 220, 100, true).translate(0, 0, 50), body);
add('grate-lip', box(1248, 228.8, 20, true).translate(0, 0, 110), accent);
add('grate-bar-0', box(12, 198, 10, true).translate(-540, 0, 125), body);
add('grate-bar-1', box(12, 198, 10, true).translate(-420, 0, 125), body);
add('grate-bar-2', box(12, 198, 10, true).translate(-300, 0, 125), body);
add('grate-bar-3', box(12, 198, 10, true).translate(-180, 0, 125), body);
add('grate-bar-4', box(12, 198, 10, true).translate(-60, 0, 125), body);
add('grate-bar-5', box(12, 198, 10, true).translate(60, 0, 125), body);
add('grate-bar-6', box(12, 198, 10, true).translate(180, 0, 125), body);
add('grate-bar-7', box(12, 198, 10, true).translate(300, 0, 125), body);
add('grate-bar-8', box(12, 198, 10, true).translate(420, 0, 125), body);
add('grate-bar-9', box(12, 198, 10, true).translate(540, 0, 125), body);
add('end-outlet', cylinder(130, 30, 8).translate(504, 0, 0), accent);

return p.model();
