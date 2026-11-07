// SPDX-License-Identifier: CC0-1.0
// Root-crop harvester with front lifting row, cleaning web, storage body and high clearance.
meta({
  name: "sugar-beet-harvester",
  license: 'CC0-1.0',
  title: "Sugar-beet harvester",
  description: "Root-crop harvester with front lifting row, cleaning web, storage body and high clearance. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('sugar-beet-harvester');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('harvester-chassis', box(1296, 1998, 210, true).translate(0, 0, 425), paintedSteelColor);
add('storage-bunker', slopedPrism(1116, 1836, 1222).translate(0, 135, 2185.5), paintedSteelColor);
add('field-wheel--1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, -1188, 280), rubberColor);
add('field-wheel--1-hub', cylinder(143, 95.2, 10).translate(-71.5, -1188, 280), steelColor);
add('elevator-side--1', box(72, 1674, 1410, true).translate(-612, 0, 1833), paintedSteelColor);
add('field-wheel-1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, 1188, 280), rubberColor);
add('field-wheel-1-hub', cylinder(143, 95.2, 10).translate(-71.5, 1188, 280), steelColor);
add('elevator-side-1', box(72, 1674, 1410, true).translate(612, 0, 1833), paintedSteelColor);
add('digging-share', box(1296, 200, 75, true).translate(0, -1377, 82.5), steelColor);
add('separator-roller-0', cylinder(44, 58, 8).translate(-540, -675, 90), steelColor);
add('separator-roller-1', cylinder(44, 58, 8).translate(-385.714, -675, 90), steelColor);
add('separator-roller-2', cylinder(44, 58, 8).translate(-231.429, -675, 90), steelColor);
add('separator-roller-3', cylinder(44, 58, 8).translate(-77.143, -675, 90), steelColor);
add('separator-roller-4', cylinder(44, 58, 8).translate(77.143, -675, 90), steelColor);
add('separator-roller-5', cylinder(44, 58, 8).translate(231.429, -675, 90), steelColor);
add('separator-roller-6', cylinder(44, 58, 8).translate(385.714, -675, 90), steelColor);
add('separator-roller-7', cylinder(44, 58, 8).translate(540, -675, 90), steelColor);
add('transfer-conveyor', box(1404, 220, 70, true).translate(0, 945, 1327.5), paintedSteelColor);
add('cleaning-web', box(1080, 945, 60, true).translate(0, -54, 923), steelColor);

return p.model();
