// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly potato harvester scene prop, modeled from scratch.
meta({
  name: "potato-harvester",
  license: 'CC0-1.0',
  title: "Potato harvester",
  description: "Trailed potato harvester with digging share, separator web, collection bunker and wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('potato-harvester');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('harvester-chassis', box(1116, 1776, 210, true).translate(0, 0, 425), body);
add('storage-bunker', box(961, 1632, 910, true).translate(0, 120, 1627.5), accent);
add('field-wheel--1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, -1056, 280), "#414848");
add('field-wheel--1-hub', cylinder(143, 95.2, 10).translate(-71.5, -1056, 280), accent);
add('elevator-side--1', box(72, 1488, 1050, true).translate(-527, 0, 1365), body);
add('field-wheel-1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, 1056, 280), "#414848");
add('field-wheel-1-hub', cylinder(143, 95.2, 10).translate(-71.5, 1056, 280), accent);
add('elevator-side-1', box(72, 1488, 1050, true).translate(527, 0, 1365), body);
add('digging-share', box(1116, 200, 75, true).translate(0, -1224, 82.5), body);
add('separator-roller-0', cylinder(44, 58, 8).translate(-465, -600, 90), accent);
add('separator-roller-1', cylinder(44, 58, 8).translate(-332.143, -600, 90), accent);
add('separator-roller-2', cylinder(44, 58, 8).translate(-199.286, -600, 90), accent);
add('separator-roller-3', cylinder(44, 58, 8).translate(-66.429, -600, 90), accent);
add('separator-roller-4', cylinder(44, 58, 8).translate(66.429, -600, 90), accent);
add('separator-roller-5', cylinder(44, 58, 8).translate(199.286, -600, 90), accent);
add('separator-roller-6', cylinder(44, 58, 8).translate(332.143, -600, 90), accent);
add('separator-roller-7', cylinder(44, 58, 8).translate(465, -600, 90), accent);
add('transfer-conveyor', box(1209, 220, 70, true).translate(0, 840, 997.5), body);

return p.model();
