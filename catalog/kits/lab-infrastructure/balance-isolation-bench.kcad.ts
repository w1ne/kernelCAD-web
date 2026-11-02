// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly balance isolation bench scene prop, modeled from scratch.
meta({
  name: 'balance-isolation-bench',
  license: 'CC0-1.0',
  title: 'Balance isolation bench',
  description: 'Compact weighing station with a heavy isolated stone slab, rigid frame and lower shelf. Knobs: overall scale, body color and accent color.',
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
const p = assembly('balance-isolation-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(850, 650, 36, true).translate(0, 0, 832), accent);
add('leg-0--260-0', box(42, 42, 814, true).translate(-365.5, -260, 407), body);
add('leg-0-260-0', box(42, 42, 814, true).translate(-365.5, 260, 407), body);
add('leg-1--260-0', box(42, 42, 814, true).translate(-121.833, -260, 407), body);
add('leg-1-260-0', box(42, 42, 814, true).translate(-121.833, 260, 407), body);
add('leg-2--260-0', box(42, 42, 814, true).translate(121.833, -260, 407), body);
add('leg-2-260-0', box(42, 42, 814, true).translate(121.833, 260, 407), body);
add('leg-3--260-0', box(42, 42, 814, true).translate(365.5, -260, 407), body);
add('leg-3-260-0', box(42, 42, 814, true).translate(365.5, 260, 407), body);
add('lower-cross-rail', box(731, 36, 28, true).translate(0, 0, 218), accent);
add('lower-shelf', box(697, 468, 24, true).translate(0, 0, 234), accent);

return p.model();
