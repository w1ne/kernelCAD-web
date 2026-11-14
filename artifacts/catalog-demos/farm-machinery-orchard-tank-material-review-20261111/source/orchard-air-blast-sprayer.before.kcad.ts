// SPDX-License-Identifier: CC0-1.0
// Compact orchard sprayer with tank, axial fan ring, nozzle bank and trailer wheels.
meta({
  name: "orchard-air-blast-sprayer",
  license: 'CC0-1.0',
  title: "Orchard air-blast sprayer",
  description: "Compact orchard sprayer with tank, axial fan ring, nozzle bank and trailer wheels. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('orchard-air-blast-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(814, 736, 135, true).translate(0, 0, 587.5), paintedSteelColor);
add('chemical-tank', slopedPrism(693, 437, 585).translate(0, 34.5, 1117.5), paintedSteelColor);
add('high-wheel--352-0--460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-398, -460, 430), rubberColor);
add('high-wheel--352-0--460-0-hub', cylinder(101.2, 146.2, 10).translate(-402.6, -460, 430), steelColor);
add('high-wheel--352-0-460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-398, 460, 430), rubberColor);
add('high-wheel--352-0-460-0-hub', cylinder(101.2, 146.2, 10).translate(-402.6, 460, 430), steelColor);
add('high-wheel-352-0--460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(306, -460, 430), rubberColor);
add('high-wheel-352-0--460-0-hub', cylinder(101.2, 146.2, 10).translate(301.4, -460, 430), steelColor);
add('high-wheel-352-0-460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(306, 460, 430), rubberColor);
add('high-wheel-352-0-460-0-hub', cylinder(101.2, 146.2, 10).translate(301.4, 460, 430), steelColor);
add('operator-cab', box(462, 460, 510, true).translate(-275, -310.5, 1425), paintedSteelColor);
add('cab-window', box(341, 18, 330, true).translate(-275, -552, 1365), glassColor);

return p.model();
