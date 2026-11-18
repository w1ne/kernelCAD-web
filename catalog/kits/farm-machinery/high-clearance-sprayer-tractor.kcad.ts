// SPDX-License-Identifier: CC0-1.0
// Tall crop-care tractor with raised axle clearance, narrow tires and a central operator cab.
meta({
  name: "high-clearance-sprayer-tractor",
  license: 'CC0-1.0',
  title: "High-clearance crop tractor",
  description: "Tall crop-care tractor with raised axle clearance, narrow tires and a central operator cab. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('high-clearance-sprayer-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 320, 12).rotate([0, 1, 0], 90).translate(-356, -301, 320), rubberColor);
add('rear-wheel--1-hub', cylinder(105.6, 108.8, 10).translate(-360.8, -301, 320), steelColor);
add('front-wheel--1', cylinder(76, 300, 12).rotate([0, 1, 0], 90).translate(325, -301, 300), rubberColor);
add('front-wheel--1-hub', cylinder(83.6, 102, 10).translate(321.2, -301, 300), steelColor);
add('rear-wheel-1', cylinder(96, 320, 12).rotate([0, 1, 0], 90).translate(-356, 301, 320), rubberColor);
add('rear-wheel-1-hub', cylinder(105.6, 108.8, 10).translate(-360.8, 301, 320), steelColor);
add('front-wheel-1', cylinder(76, 300, 12).rotate([0, 1, 0], 90).translate(325, 301, 300), rubberColor);
add('front-wheel-1-hub', cylinder(83.6, 102, 10).translate(321.2, 301, 300), steelColor);
add('main-chassis', box(825, 378, 150, true).translate(-44, 0, 318.2), paintedSteelColor);
add('engine-hood', slopedPrism(484, 329, 230.4).translate(242, 0, 458.4), paintedSteelColor);
add('front-grille', box(38, 266, 140.8, true).translate(495, 0, 423.6), steelColor);
add('rear-fender-left', box(308, 150, 36, true).translate(-308, -196, 568.4), paintedSteelColor);
add('rear-fender-right', box(308, 150, 36, true).translate(-308, 196, 568.4), paintedSteelColor);
add('cab-floor', box(352, 336, 45, true).translate(-220, 0, 458.5), paintedSteelColor);
add('cab-glazing-front', box(24, 315.84, 249.6, true).translate(-55, 0, 610.8), glassColor);
add('cab-glazing-rear', box(24, 315.84, 249.6, true).translate(-385, 0, 610.8), glassColor);
add('cab-pillar--1', box(352, 30, 288, true).translate(-220, -168, 650), paintedSteelColor);
add('cab-pillar-1', box(352, 30, 288, true).translate(-220, 168, 650), paintedSteelColor);
add('cab-roof', box(422.4, 403.2, 70, true).translate(-220, 0, 733.4), paintedSteelColor);
add('exhaust-stack', cylinder(240, 24, 8).translate(198, -98, 473.6), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-506.5, 0, 213.2), steelColor);
add('front-weight-block', box(250, 315, 150, true).translate(564, 0, 383.2), steelColor);
add('high-clearance-portal', box(150, 336, 220, true).translate(0, 0, 608.4), paintedSteelColor);

return p.model();
