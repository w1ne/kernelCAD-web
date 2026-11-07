// SPDX-License-Identifier: CC0-1.0
// Vertical grain-drying tower with intake hopper, vented chamber, service ladder and exhaust cap.
meta({
  name: "grain-dryer",
  license: 'CC0-1.0',
  title: "Farm grain dryer",
  description: "Vertical grain-drying tower with intake hopper, vented chamber, service ladder and exhaust cap. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('grain-dryer');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('dryer-base', box(1375, 1312.5, 60, true).translate(0, 0, 30), paintedSteelColor);
add('drying-column', slopedPrism(1100, 1050, 1728).translate(0, 0, 924), paintedSteelColor);
add('inlet-hopper', slopedPrism(1232, 1176, 250).translate(0, 0, 1877), paintedSteelColor);
add('exhaust-cap', box(880, 840, 100, true).translate(0, 0, 2282), steelColor);
add('ladder-rail--1', box(28, 28, 2064, true).translate(-638, -609, 1032), steelColor);
add('ladder-rail-1', box(28, 28, 2064, true).translate(638, -609, 1032), steelColor);
add('drying-vent-0', box(572, 16, 22, true).translate(0, -546, 491), steelColor);
add('drying-vent-1', box(572, 16, 22, true).translate(0, -546, 683), steelColor);
add('drying-vent-2', box(572, 16, 22, true).translate(0, -546, 875), steelColor);
add('drying-vent-3', box(572, 16, 22, true).translate(0, -546, 1067), steelColor);
add('drying-vent-4', box(572, 16, 22, true).translate(0, -546, 1259), steelColor);
add('drying-vent-5', box(572, 16, 22, true).translate(0, -546, 1451), steelColor);
add('drying-vent-6', box(572, 16, 22, true).translate(0, -546, 1643), steelColor);

return p.model();
