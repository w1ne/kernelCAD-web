// SPDX-License-Identifier: CC0-1.0
// Small utility tractor with compact bonnet, open operator station and rear implement hitch.
meta({
  name: "compact-utility-tractor",
  license: 'CC0-1.0',
  title: "Compact utility tractor",
  description: "Small utility tractor with compact bonnet, open operator station and rear implement hitch. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('compact-utility-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 300, 12).rotate([0, 1, 0], 90).translate(-286, -249.4, 300), rubberColor);
add('rear-wheel--1-hub', cylinder(105.6, 102, 10).translate(-290.8, -249.4, 300), steelColor);
add('front-wheel--1', cylinder(76, 220, 12).rotate([0, 1, 0], 90).translate(242.5, -249.4, 220), rubberColor);
add('front-wheel--1-hub', cylinder(83.6, 74.8, 10).translate(238.7, -249.4, 220), steelColor);
add('rear-wheel-1', cylinder(96, 300, 12).rotate([0, 1, 0], 90).translate(-286, 249.4, 300), rubberColor);
add('rear-wheel-1-hub', cylinder(105.6, 102, 10).translate(-290.8, 249.4, 300), steelColor);
add('front-wheel-1', cylinder(76, 220, 12).rotate([0, 1, 0], 90).translate(242.5, 249.4, 220), rubberColor);
add('front-wheel-1-hub', cylinder(83.6, 74.8, 10).translate(238.7, 249.4, 220), steelColor);
add('main-chassis', box(637.5, 313.2, 150, true).translate(-34, 0, 303), paintedSteelColor);
add('engine-hood', slopedPrism(374, 272.6, 216).translate(187, 0, 436), paintedSteelColor);
add('front-grille', box(38, 220.4, 132, true).translate(382.5, 0, 404), steelColor);
add('rear-fender-left', box(238, 150, 36, true).translate(-238, -162.4, 534), paintedSteelColor);
add('rear-fender-right', box(238, 150, 36, true).translate(-238, 162.4, 534), paintedSteelColor);
add('operator-platform', box(263.5, 313.2, 32, true).translate(-170, 0, 484), paintedSteelColor);
add('roll-bar-left', box(34, 34, 360, true).translate(-187, -127.6, 543), paintedSteelColor);
add('roll-bar-right', box(34, 34, 360, true).translate(-187, 127.6, 543), paintedSteelColor);
add('exhaust-stack', cylinder(225, 24, 8).translate(153, -81.2, 444), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-402.75, 0, 198), steelColor);
add('front-weight-block', box(250, 261, 150, true).translate(454, 0, 368), steelColor);

return p.model();
