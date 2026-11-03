// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom gowning bench scene prop, modeled from scratch.
meta({
  name: 'cleanroom-gowning-bench',
  license: 'CC0-1.0',
  title: 'Cleanroom gowning bench',
  description: 'Hygiene-zone bench with a divided clean-side seat, shoe shelf and stable tubular base. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-gowning-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1200, 500, 32, true).translate(0, 0, 484), accent);
add('leg-0--200-0', box(42, 42, 468, true).translate(-516, -200, 234), body);
add('leg-0-200-0', box(42, 42, 468, true).translate(-516, 200, 234), body);
add('leg-1--200-0', box(42, 42, 468, true).translate(-172, -200, 234), body);
add('leg-1-200-0', box(42, 42, 468, true).translate(-172, 200, 234), body);
add('leg-2--200-0', box(42, 42, 468, true).translate(172, -200, 234), body);
add('leg-2-200-0', box(42, 42, 468, true).translate(172, 200, 234), body);
add('leg-3--200-0', box(42, 42, 468, true).translate(516, -200, 234), body);
add('leg-3-200-0', box(42, 42, 468, true).translate(516, 200, 234), body);
add('lower-cross-rail', box(1032, 36, 28, true).translate(0, 0, 134), accent);
add('lower-shelf', box(984, 360, 24, true).translate(0, 0, 150), accent);

return p.model();
