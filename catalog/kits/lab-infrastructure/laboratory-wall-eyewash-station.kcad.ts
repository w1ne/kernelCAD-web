// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory wall eyewash station scene prop, modeled from scratch.
meta({
  name: 'laboratory-wall-eyewash-station',
  license: 'CC0-1.0',
  title: 'Laboratory wall eyewash station',
  description: 'Wall-mounted wash station with paired bowls, twin spray heads and a marked backplate. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-wall-eyewash-station');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('wall-backplate', box(520, 45, 420, true).translate(0, 0, 210), body);
add('basin-rim', box(488.8, 114.4, 36, true).translate(0, -123.2, 85.2), accent);
add('basin', box(395.2, 74.8, 30, true).translate(0, -105.6, 69.6), body);
add('spray-post--1', cylinder(243.6, 12, 8).translate(-145.6, -77, 75.6), accent);
add('spray-head--1', cylinder(34, 24, 8).translate(-145.6, -77, 315), body);
add('spray-post-1', cylinder(243.6, 12, 8).translate(145.6, -77, 75.6), accent);
add('spray-head-1', cylinder(34, 24, 8).translate(145.6, -77, 315), body);
add('activation-handle', box(239.2, 22, 22, true).translate(0, -149.6, 221), accent);

return p.model();
