// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly l-shaped laboratory bench scene prop, modeled from scratch.
meta({
  name: 'l-shaped-laboratory-bench',
  license: 'CC0-1.0',
  title: 'L-shaped laboratory bench',
  description: 'Corner laboratory bench with a return worktop, underbench storage and a raised end panel. Knobs: overall scale, body color and accent color.',
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
const p = assembly('l-shaped-laboratory-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('long-top', box(1400, 620, 34, true).translate(0, 0, 883), accent);
add('return-top', box(900, 620, 34, true).translate(616, 260.4, 883), accent);
add('leg--588-0--248-0', box(42, 42, 866, true).translate(-588, -248, 433), body);
add('leg--588-0-248-0', box(42, 42, 866, true).translate(-588, 248, 433), body);
add('leg-588-0--248-0', box(42, 42, 866, true).translate(588, -248, 433), body);
add('leg-588-0-248-0', box(42, 42, 866, true).translate(588, 248, 433), body);
add('return-cabinet-0', box(350, 471.2, 760, true).translate(-392, 0, 450), body);
add('return-door-0', box(322, 18, 710, true).translate(-392, -241.8, 445), accent);
add('return-cabinet-1', box(350, 471.2, 760, true).translate(392, 0, 450), body);
add('return-door-1', box(322, 18, 710, true).translate(392, -241.8, 445), accent);
add('end-splash', box(34, 620, 210, true).translate(658, 279, 1110), body);

return p.model();
