// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly forage wagon scene prop, modeled from scratch.
meta({
  name: "forage-wagon",
  license: 'CC0-1.0',
  title: "Forage wagon",
  description: "High-sided forage wagon with slatted walls, walking beam wheels and drawbar. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('forage-wagon');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('wagon-chassis', box(1080, 2160, 110, true).translate(0, 0, 195), body);
add('wagon-floor', box(1269, 2112, 38, true).translate(0, 0, 269), accent);
add('wagon-side--1', box(54, 2064, 1590, true).translate(-621, 0, 1045), body);
add('wagon-side-1', box(54, 2064, 1590, true).translate(621, 0, 1045), body);
add('wagon-front', box(1215, 70, 1600, true).translate(0, -1008, 1050), accent);
add('wagon-rear', box(1215, 70, 1600, true).translate(0, 1008, 1050), accent);
add('wagon-wheel--1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, -702, 240), "#414848");
add('wagon-wheel--1-hub', cylinder(143, 81.6, 10).translate(-71.5, -702, 240), accent);
add('wagon-wheel-1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, 702, 240), "#414848");
add('wagon-wheel-1-hub', cylinder(143, 81.6, 10).translate(-71.5, 702, 240), accent);
add('drawbar', box(105, 1200, 72, true).translate(0, -1560, 146), body);

return p.model();
