// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory water service console scene prop, modeled from scratch.
meta({
  name: 'laboratory-water-service-console',
  license: 'CC0-1.0',
  title: 'Laboratory water service console',
  description: 'Compact sink-side water console with twin taps, valve knobs and a raised splash shield. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-water-service-console');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('splash-panel', box(680, 40, 520, true).translate(0, 96, 260), body);
add('mounting-base', box(680, 300, 40, true).translate(0, 0, 20), accent);
add('tap-riser-0', cylinder(374.4, 12, 8).translate(-183.6, 0, 40), accent);
add('tap-spout-0', box(95, 25, 18, true).translate(-138.6, -16, 398.4), accent);
add('valve-handle-0', box(68, 22, 16, true).translate(-221.6, -10, 242), body);
add('tap-riser-1', cylinder(374.4, 12, 8).translate(183.6, 0, 40), accent);
add('tap-spout-1', box(95, 25, 18, true).translate(228.6, -16, 398.4), accent);
add('valve-handle-1', box(68, 22, 16, true).translate(145.6, -10, 242), body);

return p.model();
