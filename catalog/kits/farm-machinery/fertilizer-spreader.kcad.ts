// SPDX-License-Identifier: CC0-1.0
// Tractor-mounted fertilizer hopper with twin spinner discs, guard frame and support feet.
meta({
  name: "fertilizer-spreader",
  license: 'CC0-1.0',
  title: "Fertilizer spreader",
  description: "Tractor-mounted fertilizer hopper with twin spinner discs, guard frame and support feet. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('fertilizer-spreader');
const groundOffset = 35;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('spreader-frame', box(722.5, 554.8, 76, true).translate(0, 0, 73), paintedSteelColor);
add('fertilizer-hopper', slopedPrism(680, 554.8, 714).translate(0, 0, 924), paintedSteelColor);
add('hopper-lid', slopedPrism(748, 598.6, 38).translate(0, 0, 953.5), paintedSteelColor);
add('spinner--1', cylinder(35, 135, 10).translate(-187, -306.6, 80), steelColor);
add('spinner-vane--1', box(210, 24, 15, true).translate(-187, -306.6, 132.5), steelColor);
add('spinner-1', cylinder(35, 135, 10).translate(187, -306.6, 80), steelColor);
add('spinner-vane-1', box(210, 24, 15, true).translate(187, -306.6, 132.5), steelColor);
add('mounting-tower', box(289, 85, 567, true).translate(0, 328.5, 682.5), paintedSteelColor);

return p.model();
