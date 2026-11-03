// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly self-propelled field sprayer scene prop, modeled from scratch.
meta({
  name: "self-propelled-field-sprayer",
  license: 'CC0-1.0',
  title: "Self-propelled field sprayer",
  description: "High-clearance crop sprayer with four tall tires, central cab, tank and long booms. Knobs: overall scale, body color and accent color.",
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
const p = assembly('self-propelled-field-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(1332, 1344, 135, true).translate(0, 0, 587.5), body);
add('chemical-tank', box(1134, 798, 1053, true).translate(0, 63, 2011.5), accent);
add('high-wheel--576-0--840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-622, -840, 430), "#414848");
add('high-wheel--576-0--840-0-hub', cylinder(101.2, 146.2, 10).translate(-626.6, -840, 430), accent);
add('high-wheel--576-0-840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-622, 840, 430), "#414848");
add('high-wheel--576-0-840-0-hub', cylinder(101.2, 146.2, 10).translate(-626.6, 840, 430), accent);
add('high-wheel-576-0--840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(530, -840, 430), "#414848");
add('high-wheel-576-0--840-0-hub', cylinder(101.2, 146.2, 10).translate(525.4, -840, 430), accent);
add('high-wheel-576-0-840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(530, 840, 430), "#414848");
add('high-wheel-576-0-840-0-hub', cylinder(101.2, 146.2, 10).translate(525.4, 840, 430), accent);
add('operator-cab', box(756, 840, 918, true).translate(-450, -567, 2565), body);
add('cab-window', box(558, 18, 594, true).translate(-450, -1008, 2457), accent);
add('boom-wing--1', box(1904, 58, 52, true).translate(-1904, -252, 2078), accent);
add('boom-wing-1', box(1904, 58, 52, true).translate(1904, -252, 2078), accent);

return p.model();
