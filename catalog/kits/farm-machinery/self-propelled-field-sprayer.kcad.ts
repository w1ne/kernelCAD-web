// SPDX-License-Identifier: CC0-1.0
// High-clearance crop sprayer with four tall tires, central cab, tank and long booms.
meta({
  name: "self-propelled-field-sprayer",
  license: 'CC0-1.0',
  title: "Self-propelled field sprayer",
  description: "High-clearance crop sprayer with four tall tires, central cab, tank and long booms. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const glassColor = param('glassColor', '#6d9ca4', { label: 'Cab glass' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', glassColor: '#54757b', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', glassColor: '#79aeb4', steelColor: '#abb2ad' },
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
const p = assembly('self-propelled-field-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(1332, 1344, 135, true).translate(0, 0, 587.5), paintedSteelColor);
add('chemical-tank', slopedPrism(1134, 798, 1053).translate(0, 63, 2011.5), paintedSteelColor);
add('high-wheel--576-0--840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-622, -840, 430), rubberColor);
add('high-wheel--576-0--840-0-hub', cylinder(101.2, 146.2, 10).translate(-626.6, -840, 430), steelColor);
add('high-wheel--576-0-840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-622, 840, 430), rubberColor);
add('high-wheel--576-0-840-0-hub', cylinder(101.2, 146.2, 10).translate(-626.6, 840, 430), steelColor);
add('high-wheel-576-0--840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(530, -840, 430), rubberColor);
add('high-wheel-576-0--840-0-hub', cylinder(101.2, 146.2, 10).translate(525.4, -840, 430), steelColor);
add('high-wheel-576-0-840-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(530, 840, 430), rubberColor);
add('high-wheel-576-0-840-0-hub', cylinder(101.2, 146.2, 10).translate(525.4, 840, 430), steelColor);
add('operator-cab', box(756, 840, 918, true).translate(-450, -567, 2565), paintedSteelColor);
add('cab-window', box(558, 18, 594, true).translate(-450, -1008, 2457), glassColor);
add('boom-wing--1', box(1904, 58, 52, true).translate(-1904, -252, 2078), paintedSteelColor);
add('boom-wing-1', box(1904, 58, 52, true).translate(1904, -252, 2078), paintedSteelColor);

return p.model();
