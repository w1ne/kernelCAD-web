// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly farm grain auger scene prop, modeled from scratch.
meta({
  name: "farm-grain-auger",
  license: 'CC0-1.0',
  title: "Farm grain auger",
  description: "Portable grain auger with intake hopper, segmented tube, transport wheels and support stand. Knobs: overall scale, body color and accent color.",
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
const p = assembly('farm-grain-auger');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('support-base', box(1260, 1155, 55, true).translate(0, 0, 27.5), accent);
add('intake-hopper', box(892.5, 400, 360, true).translate(0, -1640, 260), body);
add('auger-lower-tube', box(150, 2050, 140, true).translate(0, -1025, 716), accent);
add('auger-upper-tube', box(135, 1394, 125, true).translate(0, 656, 1848.5), body);
add('grain-discharge', box(220, 280, 230, true).translate(0, 1517, 2851), accent);
add('transport-wheel--1', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-35, -609, 140), "#414848");
add('transport-wheel--1-hub', cylinder(77, 47.6, 10).translate(-38.5, -609, 140), accent);
add('transport-wheel-1', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-35, 609, 140), "#414848");
add('transport-wheel-1-hub', cylinder(77, 47.6, 10).translate(-38.5, 609, 140), accent);
add('support-leg-0', box(36, 38, 494, true).translate(315, -615, 377), body);
add('support-leg-1', box(36, 38, 494, true).translate(-315, -205, 1023), body);
add('support-leg-2', box(36, 38, 494, true).translate(315, 205, 1669), body);
add('support-leg-3', box(36, 38, 494, true).translate(-315, 615, 2315), body);

return p.model();
