// SPDX-License-Identifier: CC0-1.0
// Precision planter with individual seed boxes, parallel-link row units and gauge wheels.
meta({
  name: "precision-planter",
  license: 'CC0-1.0',
  title: "Precision planter",
  description: "Precision planter with individual seed boxes, parallel-link row units and gauge wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('precision-planter');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(2000, 441, 90, true).translate(0, 0, 643), paintedSteelColor);
add('seed-hopper', slopedPrism(1520, 735, 624).translate(0, 52.5, 1248), paintedSteelColor);
add('side-hopper--1', slopedPrism(440, 651, 572).translate(-500, 42, 1222), paintedSteelColor);
add('side-hopper-1', slopedPrism(440, 651, 572).translate(500, 42, 1222), paintedSteelColor);
add('seed-box-0', box(165, 180, 210, true).translate(-840, 84, 911), paintedSteelColor);
add('seed-box-1', box(165, 180, 210, true).translate(-504, 84, 911), paintedSteelColor);
add('seed-box-2', box(165, 180, 210, true).translate(-168, 84, 911), paintedSteelColor);
add('seed-box-3', box(165, 180, 210, true).translate(168, 84, 911), paintedSteelColor);
add('seed-box-4', box(165, 180, 210, true).translate(504, 84, 911), paintedSteelColor);
add('seed-box-5', box(165, 180, 210, true).translate(840, 84, 911), paintedSteelColor);
add('row-unit-0', box(70, 88, 559, true).translate(-860, -168, 591.5), steelColor);
add('press-wheel-0', cylinder(40, 58, 8).translate(-860, -336, 30), rubberColor);
add('seed-tube-0', box(22, 30, 468, true).translate(-860, 0, 559), steelColor);
add('row-unit-1', box(70, 88, 559, true).translate(-516, -168, 591.5), steelColor);
add('press-wheel-1', cylinder(40, 58, 8).translate(-516, -336, 30), rubberColor);
add('seed-tube-1', box(22, 30, 468, true).translate(-516, 0, 559), steelColor);
add('row-unit-2', box(70, 88, 559, true).translate(-172, -168, 591.5), steelColor);
add('press-wheel-2', cylinder(40, 58, 8).translate(-172, -336, 30), rubberColor);
add('seed-tube-2', box(22, 30, 468, true).translate(-172, 0, 559), steelColor);
add('row-unit-3', box(70, 88, 559, true).translate(172, -168, 591.5), steelColor);
add('press-wheel-3', cylinder(40, 58, 8).translate(172, -336, 30), rubberColor);
add('seed-tube-3', box(22, 30, 468, true).translate(172, 0, 559), steelColor);
add('row-unit-4', box(70, 88, 559, true).translate(516, -168, 591.5), steelColor);
add('press-wheel-4', cylinder(40, 58, 8).translate(516, -336, 30), rubberColor);
add('seed-tube-4', box(22, 30, 468, true).translate(516, 0, 559), steelColor);
add('row-unit-5', box(70, 88, 559, true).translate(860, -168, 591.5), steelColor);
add('press-wheel-5', cylinder(40, 58, 8).translate(860, -336, 30), rubberColor);
add('seed-tube-5', box(22, 30, 468, true).translate(860, 0, 559), steelColor);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-765, 231, 130), rubberColor);
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-769.5, 231, 130), steelColor);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(675, 231, 130), rubberColor);
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(670.5, 231, 130), steelColor);
add('tongue', box(110, 588, 65, true).translate(0, 546, 604.5), paintedSteelColor);

return p.model();
