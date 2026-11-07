// SPDX-License-Identifier: CC0-1.0
// Wide grain platform header with reel, cutter bar, end dividers and center feeder opening.
meta({
  name: "grain-header",
  license: 'CC0-1.0',
  title: "Grain header",
  description: "Wide grain platform header with reel, cutter bar, end dividers and center feeder opening. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad' },
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
const p = assembly('grain-header');
const groundOffset = 50;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('header-floor', box(4200, 961, 54, true).translate(0, 0, 97), paintedSteelColor);
add('cutterbar', box(4074, 34, 56, true).translate(0, -589, 123), paintedSteelColor);
add('end-divider--1', box(80, 682, 693, true).translate(-2016, -263.5, 808.5), paintedSteelColor);
add('end-divider-1', box(80, 682, 693, true).translate(2016, -263.5, 808.5), paintedSteelColor);
add('reel-shaft', box(3948, 46, 46, true).translate(0, 232.5, 758), steelColor);
add('reel-spoke-0', box(22, 28, 504, true).translate(-1806, 232.5, 798), steelColor);
add('snout-0', slopedPrism(336, 434, 75).translate(-1806, -806, 87.5), paintedSteelColor);
add('reel-spoke-1', box(22, 28, 504, true).translate(-1290, 232.5, 798), steelColor);
add('snout-1', slopedPrism(336, 434, 75).translate(-1290, -806, 87.5), paintedSteelColor);
add('reel-spoke-2', box(22, 28, 504, true).translate(-774, 232.5, 798), steelColor);
add('snout-2', slopedPrism(336, 434, 75).translate(-774, -806, 87.5), paintedSteelColor);
add('reel-spoke-3', box(22, 28, 504, true).translate(-258, 232.5, 798), steelColor);
add('snout-3', slopedPrism(336, 434, 75).translate(-258, -806, 87.5), paintedSteelColor);
add('reel-spoke-4', box(22, 28, 504, true).translate(258, 232.5, 798), steelColor);
add('snout-4', slopedPrism(336, 434, 75).translate(258, -806, 87.5), paintedSteelColor);
add('reel-spoke-5', box(22, 28, 504, true).translate(774, 232.5, 798), steelColor);
add('snout-5', slopedPrism(336, 434, 75).translate(774, -806, 87.5), paintedSteelColor);
add('reel-spoke-6', box(22, 28, 504, true).translate(1290, 232.5, 798), steelColor);
add('snout-6', slopedPrism(336, 434, 75).translate(1290, -806, 87.5), paintedSteelColor);
add('reel-spoke-7', box(22, 28, 504, true).translate(1806, 232.5, 798), steelColor);
add('snout-7', slopedPrism(336, 434, 75).translate(1806, -806, 87.5), paintedSteelColor);

return p.model();
