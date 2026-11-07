// SPDX-License-Identifier: CC0-1.0
// Trailed row planter with a central seed hopper and evenly spaced planting units.
meta({
  name: "row-crop-planter",
  license: 'CC0-1.0',
  title: "Row-crop planter",
  description: "Trailed row planter with a central seed hopper and evenly spaced planting units. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('row-crop-planter');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(2200, 441, 90, true).translate(0, 0, 587.8), paintedSteelColor);
add('seed-hopper', slopedPrism(1672, 735, 566.4).translate(0, 52.5, 1132.8), paintedSteelColor);
add('row-unit-0', box(70, 88, 507.4, true).translate(-946, -168, 536.9), steelColor);
add('press-wheel-0', cylinder(40, 58, 8).translate(-946, -336, 30), rubberColor);
add('seed-tube-0', box(22, 30, 424.8, true).translate(-946, 0, 507.4), steelColor);
add('row-unit-1', box(70, 88, 507.4, true).translate(-675.714, -168, 536.9), steelColor);
add('press-wheel-1', cylinder(40, 58, 8).translate(-675.714, -336, 30), rubberColor);
add('seed-tube-1', box(22, 30, 424.8, true).translate(-675.714, 0, 507.4), steelColor);
add('row-unit-2', box(70, 88, 507.4, true).translate(-405.429, -168, 536.9), steelColor);
add('press-wheel-2', cylinder(40, 58, 8).translate(-405.429, -336, 30), rubberColor);
add('seed-tube-2', box(22, 30, 424.8, true).translate(-405.429, 0, 507.4), steelColor);
add('row-unit-3', box(70, 88, 507.4, true).translate(-135.143, -168, 536.9), steelColor);
add('press-wheel-3', cylinder(40, 58, 8).translate(-135.143, -336, 30), rubberColor);
add('seed-tube-3', box(22, 30, 424.8, true).translate(-135.143, 0, 507.4), steelColor);
add('row-unit-4', box(70, 88, 507.4, true).translate(135.143, -168, 536.9), steelColor);
add('press-wheel-4', cylinder(40, 58, 8).translate(135.143, -336, 30), rubberColor);
add('seed-tube-4', box(22, 30, 424.8, true).translate(135.143, 0, 507.4), steelColor);
add('row-unit-5', box(70, 88, 507.4, true).translate(405.429, -168, 536.9), steelColor);
add('press-wheel-5', cylinder(40, 58, 8).translate(405.429, -336, 30), rubberColor);
add('seed-tube-5', box(22, 30, 424.8, true).translate(405.429, 0, 507.4), steelColor);
add('row-unit-6', box(70, 88, 507.4, true).translate(675.714, -168, 536.9), steelColor);
add('press-wheel-6', cylinder(40, 58, 8).translate(675.714, -336, 30), rubberColor);
add('seed-tube-6', box(22, 30, 424.8, true).translate(675.714, 0, 507.4), steelColor);
add('row-unit-7', box(70, 88, 507.4, true).translate(946, -168, 536.9), steelColor);
add('press-wheel-7', cylinder(40, 58, 8).translate(946, -336, 30), rubberColor);
add('seed-tube-7', box(22, 30, 424.8, true).translate(946, 0, 507.4), steelColor);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-837, 231, 130), rubberColor);
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-841.5, 231, 130), steelColor);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(747, 231, 130), rubberColor);
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(742.5, 231, 130), steelColor);
add('tongue', box(110, 588, 65, true).translate(0, 546, 551.7), paintedSteelColor);

return p.model();
