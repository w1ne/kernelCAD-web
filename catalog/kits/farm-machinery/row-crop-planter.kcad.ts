// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly row-crop planter scene prop, modeled from scratch.
meta({
  name: "row-crop-planter",
  license: 'CC0-1.0',
  title: "Row-crop planter",
  description: "Trailed row planter with a central seed hopper and evenly spaced planting units. Knobs: overall scale, body color and accent color.",
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
const p = assembly('row-crop-planter');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('planter-frame', box(2200, 441, 90, true).translate(0, 0, 587.8), accent);
add('seed-hopper', box(1672, 735, 566.4, true).translate(0, 52.5, 1132.8), body);
add('row-unit-0', box(70, 88, 507.4, true).translate(-946, -168, 536.9), body);
add('press-wheel-0', cylinder(40, 58, 8).translate(-946, -336, 30), accent);
add('seed-tube-0', box(22, 30, 424.8, true).translate(-946, 0, 507.4), accent);
add('row-unit-1', box(70, 88, 507.4, true).translate(-675.714, -168, 536.9), body);
add('press-wheel-1', cylinder(40, 58, 8).translate(-675.714, -336, 30), accent);
add('seed-tube-1', box(22, 30, 424.8, true).translate(-675.714, 0, 507.4), accent);
add('row-unit-2', box(70, 88, 507.4, true).translate(-405.429, -168, 536.9), body);
add('press-wheel-2', cylinder(40, 58, 8).translate(-405.429, -336, 30), accent);
add('seed-tube-2', box(22, 30, 424.8, true).translate(-405.429, 0, 507.4), accent);
add('row-unit-3', box(70, 88, 507.4, true).translate(-135.143, -168, 536.9), body);
add('press-wheel-3', cylinder(40, 58, 8).translate(-135.143, -336, 30), accent);
add('seed-tube-3', box(22, 30, 424.8, true).translate(-135.143, 0, 507.4), accent);
add('row-unit-4', box(70, 88, 507.4, true).translate(135.143, -168, 536.9), body);
add('press-wheel-4', cylinder(40, 58, 8).translate(135.143, -336, 30), accent);
add('seed-tube-4', box(22, 30, 424.8, true).translate(135.143, 0, 507.4), accent);
add('row-unit-5', box(70, 88, 507.4, true).translate(405.429, -168, 536.9), body);
add('press-wheel-5', cylinder(40, 58, 8).translate(405.429, -336, 30), accent);
add('seed-tube-5', box(22, 30, 424.8, true).translate(405.429, 0, 507.4), accent);
add('row-unit-6', box(70, 88, 507.4, true).translate(675.714, -168, 536.9), body);
add('press-wheel-6', cylinder(40, 58, 8).translate(675.714, -336, 30), accent);
add('seed-tube-6', box(22, 30, 424.8, true).translate(675.714, 0, 507.4), accent);
add('row-unit-7', box(70, 88, 507.4, true).translate(946, -168, 536.9), body);
add('press-wheel-7', cylinder(40, 58, 8).translate(946, -336, 30), accent);
add('seed-tube-7', box(22, 30, 424.8, true).translate(946, 0, 507.4), accent);
add('transport-wheel--1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(-837, 231, 130), "#414848");
add('transport-wheel--1-hub', cylinder(99, 44.2, 10).translate(-841.5, 231, 130), accent);
add('transport-wheel-1', cylinder(90, 130, 12).rotate([0, 1, 0], 90).translate(747, 231, 130), "#414848");
add('transport-wheel-1-hub', cylinder(99, 44.2, 10).translate(742.5, 231, 130), accent);
add('tongue', box(110, 588, 65, true).translate(0, 546, 551.7), body);

return p.model();
