// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory safety shower scene prop, modeled from scratch.
meta({
  name: 'laboratory-safety-shower',
  license: 'CC0-1.0',
  title: 'Laboratory safety shower',
  description: 'Floor-mounted emergency shower fixture with pull rod, overhead spray head and eyewash bowls. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-safety-shower');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-plate', box(560, 430, 28, true).translate(0, 0, 14), accent);
add('shower-column', cylinder(2130, 28, 8).translate(0, 0, 20), body);
add('overhead-arm', box(481.6, 42, 38, true).translate(0, 0, 2124), accent);
add('shower-head', cylinder(45, 92, 10).translate(0, 0, 2060), body);
add('pull-rod', box(22, 22, 945, true).translate(-156.8, 0, 1732.5), accent);
add('pull-handle', box(190, 30, 24, true).translate(-156.8, 0, 1249.5), body);
add('eyewash-stand--1', cylinder(340, 18, 8).translate(-190.4, 0, 35), accent);
add('eyewash-bowl--1', cylinder(38, 62, 10).translate(-190.4, 0, 350), body);
add('spray-head--1', cylinder(30, 26, 8).translate(-190.4, 0, 388), accent);
add('eyewash-stand-1', cylinder(340, 18, 8).translate(190.4, 0, 35), accent);
add('eyewash-bowl-1', cylinder(38, 62, 10).translate(190.4, 0, 350), body);
add('spray-head-1', cylinder(30, 26, 8).translate(190.4, 0, 388), accent);

return p.model();
