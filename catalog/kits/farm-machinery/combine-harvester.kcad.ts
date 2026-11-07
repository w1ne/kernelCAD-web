// SPDX-License-Identifier: CC0-1.0
// Self-propelled combine with tall grain body, operator cab, large drive wheels and unloading auger.
meta({
  name: "combine-harvester",
  license: 'CC0-1.0',
  title: "Combine harvester",
  description: "Self-propelled combine with tall grain body, operator cab, large drive wheels and unloading auger. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('combine-harvester');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1900, 1911, 210, true).translate(0, 0, 465), paintedSteelColor);
add('engine-compartment', box(1102, 1837.5, 1364, true).translate(-380, 0, 2480), paintedSteelColor);
add('grain-body', slopedPrism(1064, 1739.5, 1085).translate(-323, 147, 3022.5), paintedSteelColor);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-594.5, -1053.5, 350), rubberColor);
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-600.75, -1053.5, 350), steelColor);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(615, -1078, 220), rubberColor);
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(610, -1078, 220), steelColor);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-594.5, 1053.5, 350), rubberColor);
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-600.75, 1053.5, 350), steelColor);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(615, 1078, 220), rubberColor);
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(610, 1078, 220), steelColor);
add('cab', box(570, 1127, 1550, true).translate(456, -294, 2945), paintedSteelColor);
add('cab-roof', box(665, 1274, 55, true).translate(456, -294, 3003.5), paintedSteelColor);
add('header-feeder', box(475, 1592.5, 190, true).translate(1026, 0, 963), paintedSteelColor);
add('unloading-auger', box(1577, 65, 65, true).translate(-133, 1323, 2450.5), steelColor);
add('auger-discharge', box(120, 72, 145, true).translate(627, 1323, 2769.5), steelColor);

return p.model();
