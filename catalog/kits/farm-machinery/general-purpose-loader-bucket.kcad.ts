// SPDX-License-Identifier: CC0-1.0
// Wide front-loader bucket with rolled upper edge, side plates and cutting lip.
meta({
  name: "general-purpose-loader-bucket",
  license: 'CC0-1.0',
  title: "General-purpose loader bucket",
  description: "Wide front-loader bucket with rolled upper edge, side plates and cutting lip. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('general-purpose-loader-bucket');
const groundOffset = 20;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(861, 100, 249.4, true).translate(0, 176.8, 184.7), paintedSteelColor);
add('crossbar', box(1050, 95, 80, true).translate(0, 119.6, 306.6), paintedSteelColor);
add('bucket-floor', slopedPrism(1050, 405.6, 38).translate(0, -52, 39), paintedSteelColor);
add('bucket-cheek--1', slopedPrism(50, 520, 301).translate(-462, 0, 301), paintedSteelColor);
add('bucket-cheek-1', slopedPrism(50, 520, 301).translate(462, 0, 301), paintedSteelColor);
add('cutting-edge', box(1092, 45, 52, true).translate(0, -270.4, 66), steelColor);
add('back-shell', slopedPrism(997.5, 93.6, 232.2).translate(0, 140.4, 270.9), paintedSteelColor);

return p.model();
