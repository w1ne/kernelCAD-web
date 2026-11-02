// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly grain cart scene prop, modeled from scratch.
meta({
  name: "grain-cart",
  license: 'CC0-1.0',
  title: "Grain cart",
  description: "Large grain cart with tapered hopper, tandem wheels, auger tube and tractor drawbar. Knobs: overall scale, body color and accent color.",
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
const p = assembly('grain-cart');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('wagon-chassis', box(1200, 2115, 110, true).translate(0, 0, 195), body);
add('wagon-floor', box(1410, 2068, 38, true).translate(0, 0, 269), accent);
add('wagon-side--1', box(54, 2021, 1790, true).translate(-690, 0, 1145), body);
add('wagon-side-1', box(54, 2021, 1790, true).translate(690, 0, 1145), body);
add('wagon-front', box(1350, 70, 1800, true).translate(0, -987, 1150), accent);
add('wagon-rear', box(1350, 70, 1800, true).translate(0, 987, 1150), accent);
add('wagon-wheel--1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, -780, 240), "#414848");
add('wagon-wheel--1-hub', cylinder(143, 81.6, 10).translate(-71.5, -780, 240), accent);
add('wagon-wheel-1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, 780, 240), "#414848");
add('wagon-wheel-1-hub', cylinder(143, 81.6, 10).translate(-71.5, 780, 240), accent);
add('drawbar', box(105, 1175, 72, true).translate(0, -1527.5, 146), body);
add('grain-cover', box(1200, 1762.5, 40, true).translate(0, 0, 2310), accent);
add('auger-base', box(75, 100, 1394, true).translate(600, 470, 2009), accent);
add('auger-tube', box(360, 74, 70, true).translate(945, 470, 1880), body);

return p.model();
