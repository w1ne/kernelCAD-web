// SPDX-License-Identifier: CC0-1.0
// Compact seed drill with covered hoppers, metering row units and press wheels.
meta({
  name: "seed-drill",
  license: 'CC0-1.0',
  title: "Seed drill",
  description: "Compact seed drill with covered hoppers, metering row units and press wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('seed-drill');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(1900, 378, 90, true).translate(0, 0, 528), paintedSteelColor);
add('seed-hopper', slopedPrism(1444, 630, 504).translate(0, 45, 1008), paintedSteelColor);
add('side-hopper--1', slopedPrism(418, 558, 462).translate(-475, 36, 987), paintedSteelColor);
add('side-hopper-1', slopedPrism(418, 558, 462).translate(475, 36, 987), paintedSteelColor);
add('row-unit-0', box(70, 88, 451.5, true).translate(-817, -144, 477.75), steelColor);
add('press-wheel-0', cylinder(40, 58, 8).translate(-817, -288, 30), rubberColor);
add('seed-tube-0', box(22, 30, 378, true).translate(-817, 0, 451.5), steelColor);
add('row-unit-1', box(70, 88, 451.5, true).translate(-612.75, -144, 477.75), steelColor);
add('press-wheel-1', cylinder(40, 58, 8).translate(-612.75, -288, 30), rubberColor);
add('seed-tube-1', box(22, 30, 378, true).translate(-612.75, 0, 451.5), steelColor);
add('row-unit-2', box(70, 88, 451.5, true).translate(-408.5, -144, 477.75), steelColor);
add('press-wheel-2', cylinder(40, 58, 8).translate(-408.5, -288, 30), rubberColor);
add('seed-tube-2', box(22, 30, 378, true).translate(-408.5, 0, 451.5), steelColor);
add('row-unit-3', box(70, 88, 451.5, true).translate(-204.25, -144, 477.75), steelColor);
add('press-wheel-3', cylinder(40, 58, 8).translate(-204.25, -288, 30), rubberColor);
add('seed-tube-3', box(22, 30, 378, true).translate(-204.25, 0, 451.5), steelColor);
add('row-unit-4', box(70, 88, 451.5, true).translate(0, -144, 477.75), steelColor);
add('press-wheel-4', cylinder(40, 58, 8).translate(0, -288, 30), rubberColor);
add('seed-tube-4', box(22, 30, 378, true).translate(0, 0, 451.5), steelColor);
add('row-unit-5', box(70, 88, 451.5, true).translate(204.25, -144, 477.75), steelColor);
add('press-wheel-5', cylinder(40, 58, 8).translate(204.25, -288, 30), rubberColor);
add('seed-tube-5', box(22, 30, 378, true).translate(204.25, 0, 451.5), steelColor);
add('row-unit-6', box(70, 88, 451.5, true).translate(408.5, -144, 477.75), steelColor);
add('press-wheel-6', cylinder(40, 58, 8).translate(408.5, -288, 30), rubberColor);
add('seed-tube-6', box(22, 30, 378, true).translate(408.5, 0, 451.5), steelColor);
add('row-unit-7', box(70, 88, 451.5, true).translate(612.75, -144, 477.75), steelColor);
add('press-wheel-7', cylinder(40, 58, 8).translate(612.75, -288, 30), rubberColor);
add('seed-tube-7', box(22, 30, 378, true).translate(612.75, 0, 451.5), steelColor);
add('row-unit-8', box(70, 88, 451.5, true).translate(817, -144, 477.75), steelColor);
add('press-wheel-8', cylinder(40, 58, 8).translate(817, -288, 30), rubberColor);
add('seed-tube-8', box(22, 30, 378, true).translate(817, 0, 451.5), steelColor);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-729, 198, 130), rubberColor);
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-733.5, 198, 130), steelColor);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(639, 198, 130), rubberColor);
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(634.5, 198, 130), steelColor);
add('tongue', box(110, 504, 65, true).translate(0, 468, 494.5), paintedSteelColor);

return p.model();
