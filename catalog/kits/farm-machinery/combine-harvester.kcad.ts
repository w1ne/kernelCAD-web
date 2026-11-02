// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly combine harvester scene prop, modeled from scratch.
meta({
  name: "combine-harvester",
  license: 'CC0-1.0',
  title: "Combine harvester",
  description: "Self-propelled combine with tall grain body, operator cab, large drive wheels and unloading auger. Knobs: overall scale, body color and accent color.",
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
const p = assembly('combine-harvester');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1900, 1911, 210, true).translate(0, 0, 465), body);
add('engine-compartment', box(1102, 1837.5, 1364, true).translate(-380, 0, 2480), accent);
add('grain-body', box(1064, 1739.5, 1085, true).translate(-323, 147, 3022.5), body);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-594.5, -1053.5, 350), "#414848");
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-600.75, -1053.5, 350), accent);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(615, -1078, 220), "#414848");
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(610, -1078, 220), accent);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-594.5, 1053.5, 350), "#414848");
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-600.75, 1053.5, 350), accent);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(615, 1078, 220), "#414848");
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(610, 1078, 220), accent);
add('cab', box(570, 1127, 1550, true).translate(456, -294, 2945), accent);
add('cab-roof', box(665, 1274, 55, true).translate(456, -294, 3003.5), body);
add('header-feeder', box(475, 1592.5, 190, true).translate(1026, 0, 963), body);
add('unloading-auger', box(1577, 65, 65, true).translate(-133, 1323, 2450.5), accent);
add('auger-discharge', box(120, 72, 145, true).translate(627, 1323, 2769.5), body);

return p.model();
