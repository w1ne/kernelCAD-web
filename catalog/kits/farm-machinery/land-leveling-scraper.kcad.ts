// SPDX-License-Identifier: CC0-1.0
// Tractor-pulled land scraper with a deep open bowl, side cheeks and cutting edge.
meta({
  name: "land-leveling-scraper",
  license: 'CC0-1.0',
  title: "Land-leveling scraper",
  description: "Tractor-pulled land scraper with a deep open bowl, side cheeks and cutting edge. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
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
const p = assembly('land-leveling-scraper');
const groundOffset = 55;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1450, 110, 94, true).translate(0, 120, 425), paintedSteelColor);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 469), paintedSteelColor);
add('scraper-bowl-floor', slopedPrism(1189, 550, 40).translate(0, -80, 195), paintedSteelColor);
add('bowl-side--1', slopedPrism(65, 680, 546).translate(-551, 0, 553), paintedSteelColor);
add('bowl-side-1', slopedPrism(65, 680, 546).translate(551, 0, 553), paintedSteelColor);
add('cutting-edge', box(1247, 46, 54, true).translate(0, -420, 82), steelColor);

return p.model();
