// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly forage harvester scene prop, modeled from scratch.
meta({
  name: "forage-harvester",
  license: 'CC0-1.0',
  title: "Forage harvester",
  description: "Self-propelled forage harvester with cab, crop-processing body, discharge spout and front pickup. Knobs: overall scale, body color and accent color.",
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
const p = assembly('forage-harvester');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1550, 1599, 210, true).translate(0, 0, 465), body);
add('engine-compartment', box(899, 1537.5, 1232, true).translate(-310, 0, 2240), accent);
add('grain-body', box(868, 1455.5, 980, true).translate(-263.5, 123, 2730), body);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-496.5, -881.5, 350), "#414848");
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-502.75, -881.5, 350), accent);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(492.5, -902, 220), "#414848");
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(487.5, -902, 220), accent);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-496.5, 881.5, 350), "#414848");
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-502.75, 881.5, 350), accent);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(492.5, 902, 220), "#414848");
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(487.5, 902, 220), accent);
add('cab', box(465, 943, 1400, true).translate(372, -246, 2660), accent);
add('cab-roof', box(542.5, 1066, 55, true).translate(372, -246, 2715.5), body);
add('header-feeder', box(387.5, 1332.5, 190, true).translate(837, 0, 879), body);
add('unloading-auger', box(1286.5, 65, 65, true).translate(-108.5, 1107, 2216.5), accent);
add('auger-discharge', box(120, 72, 145, true).translate(511.5, 1107, 2508.5), body);
add('crop-spout', box(170, 220, 952, true).translate(651, 266.5, 3332), accent);
add('spout-cap', box(390, 250, 36, true).translate(651, 266.5, 3770), body);

return p.model();
