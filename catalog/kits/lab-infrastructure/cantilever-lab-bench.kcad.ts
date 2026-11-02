// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cantilever laboratory bench scene prop, modeled from scratch.
meta({
  name: 'cantilever-lab-bench',
  license: 'CC0-1.0',
  title: 'Cantilever laboratory bench',
  description: 'Wall-supported cantilever bench with knee space, a thick work surface and service rail. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cantilever-lab-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1400, 650, 32, true).translate(0, 0, 884), accent);
add('leg-0--260-0', box(42, 42, 868, true).translate(-602, -260, 434), body);
add('leg-0-260-0', box(42, 42, 868, true).translate(-602, 260, 434), body);
add('leg-1--260-0', box(42, 42, 868, true).translate(-200.667, -260, 434), body);
add('leg-1-260-0', box(42, 42, 868, true).translate(-200.667, 260, 434), body);
add('leg-2--260-0', box(42, 42, 868, true).translate(200.667, -260, 434), body);
add('leg-2-260-0', box(42, 42, 868, true).translate(200.667, 260, 434), body);
add('leg-3--260-0', box(42, 42, 868, true).translate(602, -260, 434), body);
add('leg-3-260-0', box(42, 42, 868, true).translate(602, 260, 434), body);
add('lower-cross-rail', box(1204, 36, 28, true).translate(0, 0, 230), accent);
add('wall-bracket--532-0', box(28, 520, 40, true).translate(-532, 273, 542), body);
add('wall-bracket-532-0', box(28, 520, 40, true).translate(532, 273, 542), body);
add('splashback', box(1400, 32, 250, true).translate(0, 299, 1150), body);

return p.model();
