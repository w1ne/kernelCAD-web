// SPDX-License-Identifier: CC0-1.0
// Cabbed field tractor with tall rear tires, front axle, engine hood and three-point hitch.
meta({
  name: "row-crop-tractor",
  license: 'CC0-1.0',
  title: "Row-crop tractor",
  description: "Cabbed field tractor with tall rear tires, front axle, engine hood and three-point hitch. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('row-crop-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 410, 12).rotate([0, 1, 0], 90).translate(-389.8, -309.6, 410), rubberColor);
add('rear-wheel--1-hub', cylinder(143, 139.4, 10).translate(-396.3, -309.6, 410), steelColor);
add('front-wheel--1', cylinder(76, 290, 12).rotate([0, 1, 0], 90).translate(344.8, -309.6, 290), rubberColor);
add('front-wheel--1-hub', cylinder(83.6, 98.6, 10).translate(341, -309.6, 290), steelColor);
add('rear-wheel-1', cylinder(130, 410, 12).rotate([0, 1, 0], 90).translate(-389.8, 309.6, 410), rubberColor);
add('rear-wheel-1-hub', cylinder(143, 139.4, 10).translate(-396.3, 309.6, 410), steelColor);
add('front-wheel-1', cylinder(76, 290, 12).rotate([0, 1, 0], 90).translate(344.8, 309.6, 290), rubberColor);
add('front-wheel-1-hub', cylinder(83.6, 98.6, 10).translate(341, 309.6, 290), steelColor);
add('main-chassis', box(870, 388.8, 150, true).translate(-46.4, 0, 386.6), paintedSteelColor);
add('engine-hood', slopedPrism(510.4, 338.4, 295.2).translate(255.2, 0, 559.2), paintedSteelColor);
add('front-grille', box(38, 273.6, 180.4, true).translate(522, 0, 511.8), steelColor);
add('rear-fender-left', box(324.8, 150, 36, true).translate(-324.8, -201.6, 723.2), paintedSteelColor);
add('rear-fender-right', box(324.8, 150, 36, true).translate(-324.8, 201.6, 723.2), paintedSteelColor);
add('cab-floor', box(371.2, 345.6, 45, true).translate(-232, 0, 530.5), paintedSteelColor);
add('cab-glazing-front', box(24, 324.864, 319.8, true).translate(-58, 0, 717.9), glassColor);
add('cab-glazing-rear', box(24, 324.864, 319.8, true).translate(-406, 0, 717.9), glassColor);
add('cab-pillar--1', box(371.2, 30, 369, true).translate(-232, -172.8, 762.5), paintedSteelColor);
add('cab-pillar-1', box(371.2, 30, 369, true).translate(-232, 172.8, 762.5), paintedSteelColor);
add('cab-roof', box(445.44, 414.72, 70, true).translate(-232, 0, 879.2), paintedSteelColor);
add('exhaust-stack', cylinder(307.5, 24, 8).translate(208.8, -100.8, 606.8), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-531.4, 0, 281.6), steelColor);
add('front-weight-block', box(250, 324, 150, true).translate(590.4, 0, 451.6), steelColor);

return p.model();
