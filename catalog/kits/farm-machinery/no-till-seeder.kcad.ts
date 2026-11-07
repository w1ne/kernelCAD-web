// SPDX-License-Identifier: CC0-1.0
// Heavy no-till seeder with front coulter row, large seed box and rear closing wheels.
meta({
  name: "no-till-seeder",
  license: 'CC0-1.0',
  title: "No-till seeder",
  description: "Heavy no-till seeder with front coulter row, large seed box and rear closing wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('no-till-seeder');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(2100, 441, 90, true).translate(0, 0, 597), paintedSteelColor);
add('seed-hopper', slopedPrism(1596, 735, 576).translate(0, 52.5, 1152), paintedSteelColor);
add('side-hopper--1', slopedPrism(462, 651, 528).translate(-525, 42, 1128), paintedSteelColor);
add('side-hopper-1', slopedPrism(462, 651, 528).translate(525, 42, 1128), paintedSteelColor);
add('row-unit-0', box(70, 88, 516, true).translate(-903, -168, 546), steelColor);
add('press-wheel-0', cylinder(40, 58, 8).translate(-903, -336, 30), rubberColor);
add('seed-tube-0', box(22, 30, 432, true).translate(-903, 0, 516), steelColor);
add('row-unit-1', box(70, 88, 516, true).translate(-602, -168, 546), steelColor);
add('press-wheel-1', cylinder(40, 58, 8).translate(-602, -336, 30), rubberColor);
add('seed-tube-1', box(22, 30, 432, true).translate(-602, 0, 516), steelColor);
add('row-unit-2', box(70, 88, 516, true).translate(-301, -168, 546), steelColor);
add('press-wheel-2', cylinder(40, 58, 8).translate(-301, -336, 30), rubberColor);
add('seed-tube-2', box(22, 30, 432, true).translate(-301, 0, 516), steelColor);
add('row-unit-3', box(70, 88, 516, true).translate(0, -168, 546), steelColor);
add('press-wheel-3', cylinder(40, 58, 8).translate(0, -336, 30), rubberColor);
add('seed-tube-3', box(22, 30, 432, true).translate(0, 0, 516), steelColor);
add('row-unit-4', box(70, 88, 516, true).translate(301, -168, 546), steelColor);
add('press-wheel-4', cylinder(40, 58, 8).translate(301, -336, 30), rubberColor);
add('seed-tube-4', box(22, 30, 432, true).translate(301, 0, 516), steelColor);
add('row-unit-5', box(70, 88, 516, true).translate(602, -168, 546), steelColor);
add('press-wheel-5', cylinder(40, 58, 8).translate(602, -336, 30), rubberColor);
add('seed-tube-5', box(22, 30, 432, true).translate(602, 0, 516), steelColor);
add('row-unit-6', box(70, 88, 516, true).translate(903, -168, 546), steelColor);
add('press-wheel-6', cylinder(40, 58, 8).translate(903, -336, 30), rubberColor);
add('seed-tube-6', box(22, 30, 432, true).translate(903, 0, 516), steelColor);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-801, 231, 130), rubberColor);
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-805.5, 231, 130), steelColor);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(711, 231, 130), rubberColor);
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(706.5, 231, 130), steelColor);
add('tongue', box(110, 588, 65, true).translate(0, 546, 560.5), paintedSteelColor);

return p.model();
