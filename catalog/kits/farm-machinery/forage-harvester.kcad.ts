// SPDX-License-Identifier: CC0-1.0
// Self-propelled forage harvester with cab, crop-processing body, discharge spout and front pickup.
meta({
  name: "forage-harvester",
  license: 'CC0-1.0',
  title: "Forage harvester",
  description: "Self-propelled forage harvester with cab, crop-processing body, discharge spout and front pickup. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('forage-harvester');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('combine-chassis', box(1550, 1599, 210, true).translate(0, 0, 465), paintedSteelColor);
add('engine-compartment', box(899, 1537.5, 1232, true).translate(-310, 0, 2240), paintedSteelColor);
add('grain-body', slopedPrism(868, 1455.5, 980).translate(-263.5, 123, 2730), paintedSteelColor);
add('drive-tire--1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-496.5, -881.5, 350), rubberColor);
add('drive-tire--1-hub', cylinder(137.5, 119, 10).translate(-502.75, -881.5, 350), steelColor);
add('steer-tire--1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(492.5, -902, 220), rubberColor);
add('steer-tire--1-hub', cylinder(110, 74.8, 10).translate(487.5, -902, 220), steelColor);
add('drive-tire-1', cylinder(125, 350, 12).rotate([0, 1, 0], 90).translate(-496.5, 881.5, 350), rubberColor);
add('drive-tire-1-hub', cylinder(137.5, 119, 10).translate(-502.75, 881.5, 350), steelColor);
add('steer-tire-1', cylinder(100, 220, 12).rotate([0, 1, 0], 90).translate(492.5, 902, 220), rubberColor);
add('steer-tire-1-hub', cylinder(110, 74.8, 10).translate(487.5, 902, 220), steelColor);
add('cab', box(465, 943, 1400, true).translate(372, -246, 2660), paintedSteelColor);
add('cab-roof', box(542.5, 1066, 55, true).translate(372, -246, 2715.5), paintedSteelColor);
add('header-feeder', box(387.5, 1332.5, 190, true).translate(837, 0, 879), paintedSteelColor);
add('unloading-auger', box(1286.5, 65, 65, true).translate(-108.5, 1107, 2216.5), steelColor);
add('auger-discharge', box(120, 72, 145, true).translate(511.5, 1107, 2508.5), steelColor);
add('crop-spout', box(170, 220, 952, true).translate(651, 266.5, 3332), paintedSteelColor);
add('spout-cap', box(390, 250, 36, true).translate(651, 266.5, 3770), paintedSteelColor);

return p.model();
