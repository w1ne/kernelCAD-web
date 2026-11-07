// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete placement bucket scene prop, modeled from scratch.
meta({
  name: "concrete-placement-bucket",
  license: 'CC0-1.0',
  title: "Concrete placement bucket",
  description: "Crane-suspended concrete bucket with tapered hopper, discharge gate and lifting frame. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('concrete-placement-bucket');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('bucket-floor', box(504, 476, 75, true).translate(0, 0, 37.5), body);
add('hopper-side--1', box(48, 489.6, 609, true).translate(-216, 0, 379.5), accent);
add('lifting-ear--1', box(52, 70, 420, true).translate(-201.6, 0, 787.5), body);
add('hopper-side-1', box(48, 489.6, 609, true).translate(216, 0, 379.5), accent);
add('lifting-ear-1', box(52, 70, 420, true).translate(201.6, 0, 787.5), body);
add('hopper-front', box(446.4, 48, 525, true).translate(0, -204, 337.5), body);
add('discharge-gate', box(316.8, 55, 190, true).translate(0, -238, 95), accent);
add('lifting-crossbar', box(561.6, 45, 45, true).translate(0, 0, 967.5), accent);

return p.model();
