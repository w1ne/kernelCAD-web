// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly sugar-beet harvester scene prop, modeled from scratch.
meta({
  name: "sugar-beet-harvester",
  license: 'CC0-1.0',
  title: "Sugar-beet harvester",
  description: "Root-crop harvester with front lifting row, cleaning web, storage body and high clearance. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('sugar-beet-harvester');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('harvester-chassis', box(1296, 1998, 210, true).translate(0, 0, 425), body);
add('storage-bunker', box(1116, 1836, 1222, true).translate(0, 135, 2185.5), accent);
add('field-wheel--1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, -1188, 280), "#414848");
add('field-wheel--1-hub', cylinder(143, 95.2, 10).translate(-71.5, -1188, 280), accent);
add('elevator-side--1', box(72, 1674, 1410, true).translate(-612, 0, 1833), body);
add('field-wheel-1', cylinder(130, 280, 12).rotate([0, 1, 0], 90).translate(-65, 1188, 280), "#414848");
add('field-wheel-1-hub', cylinder(143, 95.2, 10).translate(-71.5, 1188, 280), accent);
add('elevator-side-1', box(72, 1674, 1410, true).translate(612, 0, 1833), body);
add('digging-share', box(1296, 200, 75, true).translate(0, -1377, 82.5), body);
add('separator-roller-0', cylinder(44, 58, 8).translate(-540, -675, 90), accent);
add('separator-roller-1', cylinder(44, 58, 8).translate(-385.714, -675, 90), accent);
add('separator-roller-2', cylinder(44, 58, 8).translate(-231.429, -675, 90), accent);
add('separator-roller-3', cylinder(44, 58, 8).translate(-77.143, -675, 90), accent);
add('separator-roller-4', cylinder(44, 58, 8).translate(77.143, -675, 90), accent);
add('separator-roller-5', cylinder(44, 58, 8).translate(231.429, -675, 90), accent);
add('separator-roller-6', cylinder(44, 58, 8).translate(385.714, -675, 90), accent);
add('separator-roller-7', cylinder(44, 58, 8).translate(540, -675, 90), accent);
add('transfer-conveyor', box(1404, 220, 70, true).translate(0, 945, 1327.5), body);
add('cleaning-web', box(1080, 945, 60, true).translate(0, -54, 923), accent);

return p.model();
