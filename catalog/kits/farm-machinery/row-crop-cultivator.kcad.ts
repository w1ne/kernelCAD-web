// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly row-crop cultivator scene prop, modeled from scratch.
meta({
  name: "row-crop-cultivator",
  license: 'CC0-1.0',
  title: "Row-crop cultivator",
  description: "Inter-row cultivator with adjustable row units, gauge wheels and protective shields. Knobs: overall scale, body color and accent color.",
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
const p = assembly('row-crop-cultivator');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1700, 110, 94, true).translate(0, 117.6, 398), accent);
add('drawbar', box(135, 548.8, 70, true).translate(0, 421.4, 438), body);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(586.5, -225.4, 120), "#414848");
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(582.25, -225.4, 120), accent);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(586.5, 225.4, 120), "#414848");
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(582.25, 225.4, 120), accent);
add('standard-0', box(42, 58, 403, true).translate(-714, 0, 364), body);
add('cultivator-sweep-0', box(130, 170, 34, true).translate(-714, -117.6, 42), accent);
add('standard-1', box(42, 58, 403, true).translate(-428.4, 0, 364), body);
add('cultivator-sweep-1', box(130, 170, 34, true).translate(-428.4, -117.6, 42), accent);
add('standard-2', box(42, 58, 403, true).translate(-142.8, 0, 364), body);
add('cultivator-sweep-2', box(130, 170, 34, true).translate(-142.8, -117.6, 42), accent);
add('standard-3', box(42, 58, 403, true).translate(142.8, 0, 364), body);
add('cultivator-sweep-3', box(130, 170, 34, true).translate(142.8, -117.6, 42), accent);
add('standard-4', box(42, 58, 403, true).translate(428.4, 0, 364), body);
add('cultivator-sweep-4', box(130, 170, 34, true).translate(428.4, -117.6, 42), accent);
add('standard-5', box(42, 58, 403, true).translate(714, 0, 364), body);
add('cultivator-sweep-5', box(130, 170, 34, true).translate(714, -117.6, 42), accent);

return p.model();
