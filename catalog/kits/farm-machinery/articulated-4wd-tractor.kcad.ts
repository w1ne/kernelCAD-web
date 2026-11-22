// SPDX-License-Identifier: CC0-1.0
// Large articulated field tractor with equal-size tires, split chassis and high cab.
meta({
  name: "articulated-4wd-tractor",
  license: 'CC0-1.0',
  title: "Articulated four-wheel-drive tractor",
  description: "Large articulated field tractor with equal-size tires, split chassis and high cab. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('articulated-4wd-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 490, 12).rotate([0, 1, 0], 90).translate(-479.4, -369.8, 490), rubberColor);
add('rear-wheel--1-hub', cylinder(143, 166.6, 10).translate(-485.9, -369.8, 490), steelColor);
add('front-wheel--1', cylinder(100, 490, 12).rotate([0, 1, 0], 90).translate(438.4, -369.8, 490), rubberColor);
add('front-wheel--1-hub', cylinder(110, 166.6, 10).translate(433.4, -369.8, 490), steelColor);
add('rear-wheel-1', cylinder(130, 490, 12).rotate([0, 1, 0], 90).translate(-479.4, 369.8, 490), rubberColor);
add('rear-wheel-1-hub', cylinder(143, 166.6, 10).translate(-485.9, 369.8, 490), steelColor);
add('front-wheel-1', cylinder(100, 490, 12).rotate([0, 1, 0], 90).translate(438.4, 369.8, 490), rubberColor);
add('front-wheel-1-hub', cylinder(110, 166.6, 10).translate(433.4, 369.8, 490), steelColor);
add('main-chassis', box(1110, 464.4, 150, true).translate(-59.2, 0, 447.4), paintedSteelColor);
add('engine-hood', slopedPrism(651.2, 404.2, 352.8).translate(325.6, 0, 648.8), paintedSteelColor);
add('front-grille', box(38, 326.8, 215.6, true).translate(666, 0, 590.2), steelColor);
add('rear-fender-left', box(414.4, 150, 36, true).translate(-414.4, -240.8, 860.8), paintedSteelColor);
add('rear-fender-right', box(414.4, 150, 36, true).translate(-414.4, 240.8, 860.8), paintedSteelColor);
add('cab-floor', box(473.6, 412.8, 45, true).translate(-296, 0, 594.5), paintedSteelColor);
add('cab-glazing-front', box(24, 388.032, 382.2, true).translate(-74, 0, 813.1), glassColor);
add('cab-glazing-rear', box(24, 388.032, 382.2, true).translate(-518, 0, 813.1), glassColor);
add('cab-pillar--1', box(473.6, 30, 441, true).translate(-296, -206.4, 862.5), paintedSteelColor);
add('cab-pillar-1', box(473.6, 30, 441, true).translate(-296, 206.4, 862.5), paintedSteelColor);
add('cab-roof', box(568.32, 495.36, 70, true).translate(-296, 0, 1008.8), paintedSteelColor);
add('exhaust-stack', cylinder(367.5, 24, 8).translate(266.4, -120.4, 725.2), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-849.2, 0, 342.4), steelColor);
add('front-weight-block', box(250, 387, 150, true).translate(731.2, 0, 512.4), steelColor);
add('articulation-joint', box(160, 533.2, 130, true).translate(0, 0, 497.4), paintedSteelColor);
add('rear-frame', box(503.2, 533.2, 145, true).translate(-547.6, 0, 444.9), paintedSteelColor);

return p.model();
