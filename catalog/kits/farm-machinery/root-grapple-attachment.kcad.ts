// SPDX-License-Identifier: CC0-1.0
// Loader grapple bucket with lower scoop, split upper claws and hinge crossbar.
meta({
  name: "root-grapple-attachment",
  license: 'CC0-1.0',
  title: "Root grapple attachment",
  description: "Loader grapple bucket with lower scoop, split upper claws and hinge crossbar. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('root-grapple-attachment');
const groundOffset = 20;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(803.6, 100, 324.8, true).translate(0, 204, 222.4), paintedSteelColor);
add('crossbar', box(980, 95, 80, true).translate(0, 138, 387.2), paintedSteelColor);
add('bucket-floor', slopedPrism(980, 468, 38).translate(0, -60, 39), paintedSteelColor);
add('bucket-cheek--1', slopedPrism(50, 600, 392).translate(-431.2, 0, 392), paintedSteelColor);
add('bucket-cheek-1', slopedPrism(50, 600, 392).translate(431.2, 0, 392), paintedSteelColor);
add('cutting-edge', box(1019.2, 45, 52, true).translate(0, -312, 66), steelColor);
add('back-shell', slopedPrism(931, 108, 302.4).translate(0, 162, 352.8), paintedSteelColor);
add('grapple-crossbar', box(842.8, 90, 72, true).translate(0, 132, 540), paintedSteelColor);
add('grapple-tine-0', box(48, 372, 336, true).translate(-372.4, 108, 487.2), steelColor);
add('grapple-tine-1', box(48, 372, 336, true).translate(-186.2, 108, 487.2), steelColor);
add('grapple-tine-2', box(48, 372, 336, true).translate(0, 108, 487.2), steelColor);
add('grapple-tine-3', box(48, 372, 336, true).translate(186.2, 108, 487.2), steelColor);
add('grapple-tine-4', box(48, 372, 336, true).translate(372.4, 108, 487.2), steelColor);

return p.model();
