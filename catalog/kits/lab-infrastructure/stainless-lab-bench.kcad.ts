// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly stainless laboratory bench scene prop, modeled from scratch.
meta({
  name: 'stainless-lab-bench',
  license: 'CC0-1.0',
  title: 'Stainless laboratory bench',
  description: 'Open stainless-style workbench with a raised rear rail, tubular legs and lower wire shelf. Knobs: overall scale, body color and accent color.',
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
const p = assembly('stainless-lab-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1600, 700, 32, true).translate(0, 0, 884), accent);
add('leg-0--280-0', box(42, 42, 868, true).translate(-688, -280, 434), body);
add('leg-0-280-0', box(42, 42, 868, true).translate(-688, 280, 434), body);
add('leg-1--280-0', box(42, 42, 868, true).translate(-412.8, -280, 434), body);
add('leg-1-280-0', box(42, 42, 868, true).translate(-412.8, 280, 434), body);
add('leg-2--280-0', box(42, 42, 868, true).translate(-137.6, -280, 434), body);
add('leg-2-280-0', box(42, 42, 868, true).translate(-137.6, 280, 434), body);
add('leg-3--280-0', box(42, 42, 868, true).translate(137.6, -280, 434), body);
add('leg-3-280-0', box(42, 42, 868, true).translate(137.6, 280, 434), body);
add('leg-4--280-0', box(42, 42, 868, true).translate(412.8, -280, 434), body);
add('leg-4-280-0', box(42, 42, 868, true).translate(412.8, 280, 434), body);
add('leg-5--280-0', box(42, 42, 868, true).translate(688, -280, 434), body);
add('leg-5-280-0', box(42, 42, 868, true).translate(688, 280, 434), body);
add('lower-cross-rail', box(1376, 36, 28, true).translate(0, 0, 230), accent);
add('lower-shelf', box(1312, 504, 24, true).translate(0, 0, 246), accent);
add('splashback', box(1600, 32, 250, true).translate(0, 322, 1150), body);

return p.model();
