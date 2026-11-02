// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly farm grain dryer scene prop, modeled from scratch.
meta({
  name: "grain-dryer",
  license: 'CC0-1.0',
  title: "Farm grain dryer",
  description: "Vertical grain-drying tower with intake hopper, vented chamber, service ladder and exhaust cap. Knobs: overall scale, body color and accent color.",
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
const p = assembly('grain-dryer');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('dryer-base', box(1375, 1312.5, 60, true).translate(0, 0, 30), accent);
add('drying-column', box(1100, 1050, 1728, true).translate(0, 0, 924), body);
add('inlet-hopper', box(1232, 1176, 250, true).translate(0, 0, 1877), accent);
add('exhaust-cap', box(880, 840, 100, true).translate(0, 0, 2282), body);
add('ladder-rail--1', box(28, 28, 2064, true).translate(-638, -609, 1032), accent);
add('ladder-rail-1', box(28, 28, 2064, true).translate(638, -609, 1032), accent);
add('drying-vent-0', box(572, 16, 22, true).translate(0, -546, 491), accent);
add('drying-vent-1', box(572, 16, 22, true).translate(0, -546, 683), accent);
add('drying-vent-2', box(572, 16, 22, true).translate(0, -546, 875), accent);
add('drying-vent-3', box(572, 16, 22, true).translate(0, -546, 1067), accent);
add('drying-vent-4', box(572, 16, 22, true).translate(0, -546, 1259), accent);
add('drying-vent-5', box(572, 16, 22, true).translate(0, -546, 1451), accent);
add('drying-vent-6', box(572, 16, 22, true).translate(0, -546, 1643), accent);

return p.model();
