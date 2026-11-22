// SPDX-License-Identifier: CC0-1.0
// High-sided forage wagon with slatted walls, walking beam wheels and drawbar.
meta({
  name: "forage-wagon",
  license: 'CC0-1.0',
  title: "Forage wagon",
  description: "High-sided forage wagon with slatted walls, walking beam wheels and drawbar. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('forage-wagon');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('wagon-chassis', box(1080, 2160, 110, true).translate(0, 0, 195), paintedSteelColor);
add('wagon-floor', box(1269, 2112, 38, true).translate(0, 0, 269), paintedSteelColor);
add('wagon-side--1', box(54, 2064, 1590, true).translate(-621, 0, 1045), paintedSteelColor);
add('wagon-side-1', box(54, 2064, 1590, true).translate(621, 0, 1045), paintedSteelColor);
add('wagon-front', slopedPrism(1215, 70, 1600).translate(0, -1008, 1050), paintedSteelColor);
add('wagon-rear', slopedPrism(1215, 70, 1600).translate(0, 1008, 1050), paintedSteelColor);
add('wagon-wheel--1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, -702, 240), rubberColor);
add('wagon-wheel--1-hub', cylinder(143, 81.6, 10).translate(-71.5, -702, 240), steelColor);
add('wagon-wheel-1', cylinder(130, 240, 12).rotate([0, 1, 0], 90).translate(-65, 702, 240), rubberColor);
add('wagon-wheel-1-hub', cylinder(143, 81.6, 10).translate(-71.5, 702, 240), steelColor);
add('drawbar', box(105, 1200, 72, true).translate(0, -1560, 146), paintedSteelColor);

return p.model();
