// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory sink base cabinet scene prop, modeled from scratch.
meta({
  name: 'laboratory-sink-base-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory sink base cabinet',
  description: 'Open-back sink base cabinet with paired doors, plumbing clearance and a robust top rim. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-sink-base-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(800, 600, 860, true).translate(0, 0, 430), body);
add('cabinet-plinth', box(736, 540, 22, true).translate(0, 0, 11), accent);
add('door-0', box(330.24, 18, 830, true).translate(-176, -306, 845), body);
add('door-pull-0', box(14, 14, 137.6, true).translate(-65.92, -330, 516), accent);
add('door-1', box(330.24, 18, 830, true).translate(176, -306, 845), body);
add('door-pull-1', box(14, 14, 137.6, true).translate(286.08, -330, 516), accent);
add('plumbing-clearance', box(496, 18, 430, true).translate(0, 210, 627.8), accent);

return p.model();
