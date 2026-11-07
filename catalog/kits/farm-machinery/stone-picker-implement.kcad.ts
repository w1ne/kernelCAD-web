// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly stone picker implement scene prop, modeled from scratch.
meta({
  name: "stone-picker-implement",
  license: 'CC0-1.0',
  title: "Stone picker implement",
  description: "Field stone picker with a raised hopper, pickup reel guard and tandem support wheels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('stone-picker-implement');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1500, 110, 94, true).translate(0, 132, 576.2), accent);
add('drawbar', box(135, 616, 70, true).translate(0, 473, 642.6), body);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(512.5, -253, 120), "#414848");
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(508.25, -253, 120), accent);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(512.5, 253, 120), "#414848");
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(508.25, 253, 120), accent);
add('hopper', box(1200, 550, 607.6, true).translate(0, -110, 754.6), body);
add('pickup-guard', box(1140, 90, 160, true).translate(0, -473, 256.4), accent);
add('pickup-roller-0', cylinder(95, 24, 8).translate(-480, -572, 35), body);
add('pickup-roller-1', cylinder(95, 24, 8).translate(-240, -572, 35), body);
add('pickup-roller-2', cylinder(95, 24, 8).translate(0, -572, 35), body);
add('pickup-roller-3', cylinder(95, 24, 8).translate(240, -572, 35), body);
add('pickup-roller-4', cylinder(95, 24, 8).translate(480, -572, 35), body);

return p.model();
