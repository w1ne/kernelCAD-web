// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly round baler scene prop, modeled from scratch.
meta({
  name: "round-baler",
  license: 'CC0-1.0',
  title: "Round baler",
  description: "Round baler with enclosed bale chamber, pickup reel, side panels and transport wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('round-baler');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('baler-chassis', box(1080, 1188, 120, true).translate(0, 0, 220), body);
add('baler-chamber', box(1107, 1122, 1102, true).translate(0, 33, 1653), accent);
add('pickup-housing', box(1026, 170, 170, true).translate(0, -693, 185), body);
add('pickup-tooth-0', cylinder(115, 13, 6).translate(-432, -841.5, 35), accent);
add('pickup-tooth-1', cylinder(115, 13, 6).translate(-288, -841.5, 35), accent);
add('pickup-tooth-2', cylinder(115, 13, 6).translate(-144, -841.5, 35), accent);
add('pickup-tooth-3', cylinder(115, 13, 6).translate(0, -841.5, 35), accent);
add('pickup-tooth-4', cylinder(115, 13, 6).translate(144, -841.5, 35), accent);
add('pickup-tooth-5', cylinder(115, 13, 6).translate(288, -841.5, 35), accent);
add('pickup-tooth-6', cylinder(115, 13, 6).translate(432, -841.5, 35), accent);
add('baler-wheel--1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, -621, 180), "#414848");
add('baler-wheel--1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, -621, 180), accent);
add('side-access-panel--1', box(48, 792, 684, true).translate(-567, 0, 1444), body);
add('baler-wheel-1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, 621, 180), "#414848");
add('baler-wheel-1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, 621, 180), accent);
add('side-access-panel-1', box(48, 792, 684, true).translate(567, 0, 1444), body);
add('bale-chamber', cylinder(32, 418.5, 12).translate(0, 495, 1368), body);
add('drawbar', box(88, 693, 60, true).translate(0, -907.5, 180), accent);

return p.model();
