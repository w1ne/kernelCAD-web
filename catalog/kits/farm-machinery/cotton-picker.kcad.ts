// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cotton picker scene prop, modeled from scratch.
meta({
  name: "cotton-picker",
  license: 'CC0-1.0',
  title: "Cotton picker",
  description: "Tall self-propelled cotton picker with harvesting towers, cab, basket and high-clearance wheels. Knobs: overall scale, body color and accent color.",
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
const p = assembly('cotton-picker');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1850, 2028, 210, true).translate(0, 0, 465), body);
add('engine-compartment', box(1073, 1950, 1408, true).translate(-370, 0, 2560), accent);
add('grain-body', box(1036, 1846, 1120, true).translate(-314.5, 156, 3120), body);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-580.5, -1118, 350), "#414848");
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-586.75, -1118, 350), accent);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(597.5, -1144, 220), "#414848");
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(592.5, -1144, 220), accent);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-580.5, 1118, 350), "#414848");
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-586.75, 1118, 350), accent);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(597.5, 1144, 220), "#414848");
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(592.5, 1144, 220), accent);
add('cab', box(555, 1196, 1600, true).translate(444, -312, 3040), accent);
add('cab-roof', box(647.5, 1352, 55, true).translate(444, -312, 3099.5), body);
add('header-feeder', box(462.5, 1690, 190, true).translate(999, 0, 991), body);
add('unloading-auger', box(1535.5, 65, 65, true).translate(-129.5, 1404, 2528.5), accent);
add('auger-discharge', box(120, 72, 145, true).translate(610.5, 1404, 2856.5), body);
add('picker-tower-0', box(259, 936, 1472, true).translate(-573.5, 520, 3232), accent);
add('picker-door-0', box(148, 22, 896, true).translate(-573.5, -52, 2880), body);
add('picker-tower-1', box(259, 936, 1472, true).translate(-203.5, 520, 3232), accent);
add('picker-door-1', box(148, 22, 896, true).translate(-203.5, -52, 2880), body);
add('picker-tower-2', box(259, 936, 1472, true).translate(166.5, 520, 3232), accent);
add('picker-door-2', box(148, 22, 896, true).translate(166.5, -52, 2880), body);
add('picker-tower-3', box(259, 936, 1472, true).translate(536.5, 520, 3232), accent);
add('picker-door-3', box(148, 22, 896, true).translate(536.5, -52, 2880), body);

return p.model();
