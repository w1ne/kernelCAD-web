// SPDX-License-Identifier: CC0-1.0
// Field stone picker with a raised hopper, pickup reel guard and tandem support wheels.
meta({
  name: "stone-picker-implement",
  license: 'CC0-1.0',
  title: "Stone picker implement",
  description: "Field stone picker with a raised hopper, pickup reel guard and tandem support wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
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
const p = assembly('stone-picker-implement');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1500, 110, 94, true).translate(0, 132, 576.2), paintedSteelColor);
add('drawbar', box(135, 616, 70, true).translate(0, 473, 642.6), paintedSteelColor);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(512.5, -253, 120), rubberColor);
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(508.25, -253, 120), steelColor);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(512.5, 253, 120), rubberColor);
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(508.25, 253, 120), steelColor);
add('hopper', slopedPrism(1200, 550, 607.6).translate(0, -110, 754.6), paintedSteelColor);
add('pickup-guard', box(1140, 90, 160, true).translate(0, -473, 256.4), steelColor);
add('pickup-roller-0', cylinder(95, 24, 8).translate(-480, -572, 35), steelColor);
add('pickup-roller-1', cylinder(95, 24, 8).translate(-240, -572, 35), steelColor);
add('pickup-roller-2', cylinder(95, 24, 8).translate(0, -572, 35), steelColor);
add('pickup-roller-3', cylinder(95, 24, 8).translate(240, -572, 35), steelColor);
add('pickup-roller-4', cylinder(95, 24, 8).translate(480, -572, 35), steelColor);

return p.model();
