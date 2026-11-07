// SPDX-License-Identifier: CC0-1.0
// Heavy field tractor with paired rubber-track frames, broad engine housing and raised cab.
meta({
  name: "tracked-field-tractor",
  license: 'CC0-1.0',
  title: "Tracked field tractor",
  description: "Heavy field tractor with paired rubber-track frames, broad engine housing and raised cab. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('tracked-field-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 450, 12).rotate([0, 1, 0], 90).translate(-434.6, -387, 450), rubberColor);
add('rear-wheel--1-hub', cylinder(143, 153, 10).translate(-441.1, -387, 450), steelColor);
add('front-wheel--1', cylinder(100, 420, 12).rotate([0, 1, 0], 90).translate(385.6, -387, 420), rubberColor);
add('front-wheel--1-hub', cylinder(110, 142.8, 10).translate(380.6, -387, 420), steelColor);
add('track-frame--1', box(712.8, 150, 787.5, true).translate(-369.6, -387, 403.75), steelColor);
add('track-roller--1-0', cylinder(38, 81, 8).translate(-646.8, -441.18, 20), steelColor);
add('track-roller--1-1', cylinder(38, 81, 8).translate(-535.92, -441.18, 20), steelColor);
add('track-roller--1-2', cylinder(38, 81, 8).translate(-425.04, -441.18, 20), steelColor);
add('track-roller--1-3', cylinder(38, 81, 8).translate(-314.16, -441.18, 20), steelColor);
add('track-roller--1-4', cylinder(38, 81, 8).translate(-203.28, -441.18, 20), steelColor);
add('track-roller--1-5', cylinder(38, 81, 8).translate(-92.4, -441.18, 20), steelColor);
add('rear-wheel-1', cylinder(130, 450, 12).rotate([0, 1, 0], 90).translate(-434.6, 387, 450), rubberColor);
add('rear-wheel-1-hub', cylinder(143, 153, 10).translate(-441.1, 387, 450), steelColor);
add('front-wheel-1', cylinder(100, 420, 12).rotate([0, 1, 0], 90).translate(385.6, 387, 420), rubberColor);
add('front-wheel-1-hub', cylinder(110, 142.8, 10).translate(380.6, 387, 420), steelColor);
add('track-frame-1', box(712.8, 150, 787.5, true).translate(-369.6, 387, 403.75), steelColor);
add('track-roller-1-0', cylinder(38, 81, 8).translate(-646.8, 441.18, 20), steelColor);
add('track-roller-1-1', cylinder(38, 81, 8).translate(-535.92, 441.18, 20), steelColor);
add('track-roller-1-2', cylinder(38, 81, 8).translate(-425.04, 441.18, 20), steelColor);
add('track-roller-1-3', cylinder(38, 81, 8).translate(-314.16, 441.18, 20), steelColor);
add('track-roller-1-4', cylinder(38, 81, 8).translate(-203.28, 441.18, 20), steelColor);
add('track-roller-1-5', cylinder(38, 81, 8).translate(-92.4, 441.18, 20), steelColor);
add('main-chassis', box(990, 486, 150, true).translate(-52.8, 0, 417), paintedSteelColor);
add('engine-hood', slopedPrism(580.8, 423, 324).translate(290.4, 0, 604), paintedSteelColor);
add('front-grille', box(38, 342, 198, true).translate(594, 0, 551), steelColor);
add('rear-fender-left', box(369.6, 150, 36, true).translate(-369.6, -252, 792), paintedSteelColor);
add('rear-fender-right', box(369.6, 150, 36, true).translate(-369.6, 252, 792), paintedSteelColor);
add('cab-floor', box(422.4, 432, 45, true).translate(-264, 0, 562.5), paintedSteelColor);
add('cab-glazing-front', box(24, 406.08, 351, true).translate(-66, 0, 765.5), glassColor);
add('cab-glazing-rear', box(24, 406.08, 351, true).translate(-462, 0, 765.5), glassColor);
add('cab-pillar--1', box(422.4, 30, 405, true).translate(-264, -216, 812.5), paintedSteelColor);
add('cab-pillar-1', box(422.4, 30, 405, true).translate(-264, 216, 812.5), paintedSteelColor);
add('cab-roof', box(506.88, 518.4, 70, true).translate(-264, 0, 944), paintedSteelColor);
add('exhaust-stack', cylinder(337.5, 24, 8).translate(237.6, -126, 666), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-597.8, 0, 312), steelColor);
add('front-weight-block', box(250, 405, 150, true).translate(660.8, 0, 482), steelColor);

return p.model();
