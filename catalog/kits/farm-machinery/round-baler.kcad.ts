// SPDX-License-Identifier: CC0-1.0
// Round baler with enclosed bale chamber, pickup reel, side panels and transport wheels.
meta({
  name: "round-baler",
  license: 'CC0-1.0',
  title: "Round baler",
  description: "Round baler with enclosed bale chamber, pickup reel, side panels and transport wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('round-baler');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('baler-chassis', box(1080, 1188, 120, true).translate(0, 0, 220), paintedSteelColor);
add('baler-chamber', slopedPrism(1107, 1122, 1102).translate(0, 33, 1653), paintedSteelColor);
add('pickup-housing', box(1026, 170, 170, true).translate(0, -693, 185), paintedSteelColor);
add('pickup-tooth-0', cylinder(115, 13, 6).translate(-432, -841.5, 35), steelColor);
add('pickup-tooth-1', cylinder(115, 13, 6).translate(-288, -841.5, 35), steelColor);
add('pickup-tooth-2', cylinder(115, 13, 6).translate(-144, -841.5, 35), steelColor);
add('pickup-tooth-3', cylinder(115, 13, 6).translate(0, -841.5, 35), steelColor);
add('pickup-tooth-4', cylinder(115, 13, 6).translate(144, -841.5, 35), steelColor);
add('pickup-tooth-5', cylinder(115, 13, 6).translate(288, -841.5, 35), steelColor);
add('pickup-tooth-6', cylinder(115, 13, 6).translate(432, -841.5, 35), steelColor);
add('baler-wheel--1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, -621, 180), rubberColor);
add('baler-wheel--1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, -621, 180), steelColor);
add('side-access-panel--1', box(48, 792, 684, true).translate(-567, 0, 1444), paintedSteelColor);
add('baler-wheel-1', cylinder(92, 180, 12).rotate([0, 1, 0], 90).translate(-46, 621, 180), rubberColor);
add('baler-wheel-1-hub', cylinder(101.2, 61.2, 10).translate(-50.6, 621, 180), steelColor);
add('side-access-panel-1', box(48, 792, 684, true).translate(567, 0, 1444), paintedSteelColor);
add('bale-chamber', cylinder(32, 418.5, 12).translate(0, 495, 1368), paintedSteelColor);
add('drawbar', box(88, 693, 60, true).translate(0, -907.5, 180), paintedSteelColor);

return p.model();
