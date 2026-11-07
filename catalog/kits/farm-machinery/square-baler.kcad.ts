// SPDX-License-Identifier: CC0-1.0
// Small square baler with pickup teeth, rectangular chamber, flywheel guard and tandem tires.
meta({
  name: "square-baler",
  license: 'CC0-1.0',
  title: "Square baler",
  description: "Small square baler with pickup teeth, rectangular chamber, flywheel guard and tandem tires. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('square-baler');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('baler-chassis', box(944, 1656, 120, true).translate(0, 0, 220), paintedSteelColor);
add('baler-chamber', slopedPrism(967.6, 1564, 957).translate(0, 46, 1435.5), paintedSteelColor);
add('pickup-housing', box(896.8, 170, 170, true).translate(0, -966, 185), paintedSteelColor);
add('pickup-tooth-0', cylinder(115, 13, 6).translate(-377.6, -1173, 35), steelColor);
add('pickup-tooth-1', cylinder(115, 13, 6).translate(-251.733, -1173, 35), steelColor);
add('pickup-tooth-2', cylinder(115, 13, 6).translate(-125.867, -1173, 35), steelColor);
add('pickup-tooth-3', cylinder(115, 13, 6).translate(-0, -1173, 35), steelColor);
add('pickup-tooth-4', cylinder(115, 13, 6).translate(125.867, -1173, 35), steelColor);
add('pickup-tooth-5', cylinder(115, 13, 6).translate(251.733, -1173, 35), steelColor);
add('pickup-tooth-6', cylinder(115, 13, 6).translate(377.6, -1173, 35), steelColor);
add('baler-wheel--1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, -542.8, 180), rubberColor);
add('baler-wheel--1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, -542.8, 180), steelColor);
add('side-access-panel--1', box(48, 1104, 594, true).translate(-495.6, 0, 1254), paintedSteelColor);
add('baler-wheel-1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, 542.8, 180), rubberColor);
add('baler-wheel-1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, 542.8, 180), steelColor);
add('side-access-panel-1', box(48, 1104, 594, true).translate(495.6, 0, 1254), paintedSteelColor);
add('square-bale-chute', box(566.4, 1288, 660, true).translate(0, 1104, 1237.5), paintedSteelColor);
add('drawbar', box(88, 966, 60, true).translate(0, -1265, 180), paintedSteelColor);

return p.model();
