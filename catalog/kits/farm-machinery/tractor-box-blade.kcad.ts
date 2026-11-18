// SPDX-License-Identifier: CC0-1.0
// Rear grading box blade with twin side plates, replaceable cutting edge and scarifier shanks.
meta({
  name: "tractor-box-blade",
  license: 'CC0-1.0',
  title: "Tractor box blade",
  description: "Rear grading box blade with twin side plates, replaceable cutting edge and scarifier shanks. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('tractor-box-blade');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(1066, 100, 278.4, true).translate(0, 190.4, 199.2), paintedSteelColor);
add('crossbar', box(1300, 95, 80, true).translate(0, 128.8, 337.6), paintedSteelColor);
add('side-plate--1', box(52, 560, 264, true).translate(-572, 0, 261.6), paintedSteelColor);
add('side-plate-1', box(52, 560, 264, true).translate(572, 0, 261.6), paintedSteelColor);
add('moldboard', slopedPrism(1144, 60, 297.6).translate(0, 156.8, 312), steelColor);
add('cutting-edge', box(1300, 32, 42, true).translate(0, -179.2, 41), steelColor);
add('scarifier-0', box(34, 42, 240, true).translate(-442, 0, 120), paintedSteelColor);
add('scarifier-1', box(34, 42, 240, true).translate(-221, 0, 120), paintedSteelColor);
add('scarifier-2', box(34, 42, 240, true).translate(0, 0, 120), paintedSteelColor);
add('scarifier-3', box(34, 42, 240, true).translate(221, 0, 120), paintedSteelColor);
add('scarifier-4', box(34, 42, 240, true).translate(442, 0, 120), paintedSteelColor);

return p.model();
