// SPDX-License-Identifier: CC0-1.0
// Tall self-propelled cotton picker with harvesting towers, cab, basket and high-clearance wheels.
meta({
  name: "cotton-picker",
  license: 'CC0-1.0',
  title: "Cotton picker",
  description: "Tall self-propelled cotton picker with harvesting towers, cab, basket and high-clearance wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad' },
});
const slopedPrism = (width:number, depth:number, height:number) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const inset = width * 0.16;
  return path().moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth - inset, halfHeight)
    .lineTo(-halfWidth + inset, halfHeight)
    .close().extrude(depth).rotate([1, 0, 0], 90).translate(0, depth / 2, 0);
};
const p = assembly('cotton-picker');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1850, 2028, 210, true).translate(0, 0, 465), paintedSteelColor);
add('engine-compartment', box(1073, 1950, 1408, true).translate(-370, 0, 2560), paintedSteelColor);
add('grain-body', slopedPrism(1036, 1846, 1120).translate(-314.5, 156, 3120), paintedSteelColor);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-580.5, -1118, 350), rubberColor);
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-586.75, -1118, 350), steelColor);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(597.5, -1144, 220), rubberColor);
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(592.5, -1144, 220), steelColor);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-580.5, 1118, 350), rubberColor);
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-586.75, 1118, 350), steelColor);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(597.5, 1144, 220), rubberColor);
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(592.5, 1144, 220), steelColor);
add('cab', box(555, 1196, 1600, true).translate(444, -312, 3040), paintedSteelColor);
add('cab-roof', box(647.5, 1352, 55, true).translate(444, -312, 3099.5), paintedSteelColor);
add('header-feeder', box(462.5, 1690, 190, true).translate(999, 0, 991), paintedSteelColor);
add('unloading-auger', box(1535.5, 65, 65, true).translate(-129.5, 1404, 2528.5), steelColor);
add('auger-discharge', box(120, 72, 145, true).translate(610.5, 1404, 2856.5), steelColor);
add('picker-tower-0', box(259, 936, 1472, true).translate(-573.5, 520, 3232), paintedSteelColor);
add('picker-door-0', box(148, 22, 896, true).translate(-573.5, -52, 2880), paintedSteelColor);
add('picker-tower-1', box(259, 936, 1472, true).translate(-203.5, 520, 3232), paintedSteelColor);
add('picker-door-1', box(148, 22, 896, true).translate(-203.5, -52, 2880), paintedSteelColor);
add('picker-tower-2', box(259, 936, 1472, true).translate(166.5, 520, 3232), paintedSteelColor);
add('picker-door-2', box(148, 22, 896, true).translate(166.5, -52, 2880), paintedSteelColor);
add('picker-tower-3', box(259, 936, 1472, true).translate(536.5, 520, 3232), paintedSteelColor);
add('picker-door-3', box(148, 22, 896, true).translate(536.5, -52, 2880), paintedSteelColor);

return p.model();
