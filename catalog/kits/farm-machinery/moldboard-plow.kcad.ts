// SPDX-License-Identifier: CC0-1.0
// Three-bottom moldboard plow with a heavy toolbar, curved-looking shares and gauge wheel.
meta({
  name: "moldboard-plow",
  license: 'CC0-1.0',
  title: "Moldboard plow",
  description: "Three-bottom moldboard plow with a heavy toolbar, curved-looking shares and gauge wheel. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('moldboard-plow');
const groundOffset = 40;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1650, 110, 94, true).translate(0, 126, 435.8), paintedSteelColor);
add('drawbar', box(135, 588, 70, true).translate(0, 451.5, 481.4), paintedSteelColor);
add('standard-0', box(42, 58, 446.4, true).translate(-693, 0, 263.2), steelColor);
add('moldboard-share-0', slopedPrism(190, 250, 32).translate(-693, -126, 56), steelColor);
add('moldboard-wing-0', slopedPrism(110, 160, 331.2).translate(-693, -231, 315.6), paintedSteelColor);
add('standard-1', box(42, 58, 446.4, true).translate(0, 0, 263.2), steelColor);
add('moldboard-share-1', slopedPrism(190, 250, 32).translate(0, -126, 56), steelColor);
add('moldboard-wing-1', slopedPrism(110, 160, 331.2).translate(0, -231, 315.6), paintedSteelColor);
add('standard-2', box(42, 58, 446.4, true).translate(693, 0, 263.2), steelColor);
add('moldboard-share-2', slopedPrism(190, 250, 32).translate(693, -126, 56), steelColor);
add('moldboard-wing-2', slopedPrism(110, 160, 331.2).translate(693, -231, 315.6), paintedSteelColor);

return p.model();
