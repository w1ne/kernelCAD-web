// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly square baler scene prop, modeled from scratch.
meta({
  name: "square-baler",
  license: 'CC0-1.0',
  title: "Square baler",
  description: "Small square baler with pickup teeth, rectangular chamber, flywheel guard and tandem tires. Knobs: overall scale, body color and accent color.",
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
const p = assembly('square-baler');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('baler-chassis', box(944, 1656, 120, true).translate(0, 0, 220), body);
add('baler-chamber', box(967.6, 1564, 957, true).translate(0, 46, 1435.5), accent);
add('pickup-housing', box(896.8, 170, 170, true).translate(0, -966, 185), body);
add('pickup-tooth-0', cylinder(115, 13, 6).translate(-377.6, -1173, 35), accent);
add('pickup-tooth-1', cylinder(115, 13, 6).translate(-251.733, -1173, 35), accent);
add('pickup-tooth-2', cylinder(115, 13, 6).translate(-125.867, -1173, 35), accent);
add('pickup-tooth-3', cylinder(115, 13, 6).translate(-0, -1173, 35), accent);
add('pickup-tooth-4', cylinder(115, 13, 6).translate(125.867, -1173, 35), accent);
add('pickup-tooth-5', cylinder(115, 13, 6).translate(251.733, -1173, 35), accent);
add('pickup-tooth-6', cylinder(115, 13, 6).translate(377.6, -1173, 35), accent);
add('baler-wheel--1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, -542.8, 180), "#414848");
add('baler-wheel--1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, -542.8, 180), accent);
add('side-access-panel--1', box(48, 1104, 594, true).translate(-495.6, 0, 1254), body);
add('baler-wheel-1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, 542.8, 180), "#414848");
add('baler-wheel-1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, 542.8, 180), accent);
add('side-access-panel-1', box(48, 1104, 594, true).translate(495.6, 0, 1254), body);
add('square-bale-chute', box(566.4, 1288, 660, true).translate(0, 1104, 1237.5), body);
add('drawbar', box(88, 966, 60, true).translate(0, -1265, 180), accent);

return p.model();
