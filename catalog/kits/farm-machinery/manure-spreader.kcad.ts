// SPDX-License-Identifier: CC0-1.0
// Farm spreader wagon with a tall bin, rear beater bars, apron bed and drawbar.
meta({
  name: "manure-spreader",
  license: 'CC0-1.0',
  title: "Manure spreader wagon",
  description: "Farm spreader wagon with a tall bin, rear beater bars, apron bed and drawbar. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('manure-spreader');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('spreader-frame', box(1020, 1634, 76, true).translate(0, 0, 73), paintedSteelColor);
add('spreader-bin', slopedPrism(1008, 1548, 986).translate(0, 43, 1276), paintedSteelColor);
add('apron-bed', box(876, 516, 34, true).translate(0, -387, 582.5), paintedSteelColor);
add('rear-beater-0', cylinder(667, 22, 8).translate(-360, -946, 65), steelColor);
add('rear-beater-1', cylinder(667, 22, 8).translate(-180, -946, 65), steelColor);
add('rear-beater-2', cylinder(667, 22, 8).translate(0, -946, 65), steelColor);
add('rear-beater-3', cylinder(667, 22, 8).translate(180, -946, 65), steelColor);
add('rear-beater-4', cylinder(667, 22, 8).translate(360, -946, 65), steelColor);
add('wagon-wheel--1', cylinder(90, 250, 12).rotate([0, 1, 0], 90).translate(-217, -552, 250), rubberColor);
add('wagon-wheel--1-hub', cylinder(99, 85, 10).translate(-221.5, -552, 250), steelColor);
add('wagon-wheel-1', cylinder(90, 250, 12).rotate([0, 1, 0], 90).translate(-217, 552, 250), rubberColor);
add('wagon-wheel-1-hub', cylinder(99, 85, 10).translate(-221.5, 552, 250), steelColor);
add('drawbar', box(92, 967.5, 60, true).translate(0, 1247, 135), paintedSteelColor);

return p.model();
