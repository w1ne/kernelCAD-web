// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly manure spreader wagon scene prop, modeled from scratch.
meta({
  name: "manure-spreader",
  license: 'CC0-1.0',
  title: "Manure spreader wagon",
  description: "Farm spreader wagon with a tall bin, rear beater bars, apron bed and drawbar. Knobs: overall scale, body color and accent color.",
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
const p = assembly('manure-spreader');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('spreader-frame', box(1020, 1634, 76, true).translate(0, 0, 73), accent);
add('spreader-bin', box(1008, 1548, 986, true).translate(0, 43, 1276), body);
add('apron-bed', box(876, 516, 34, true).translate(0, -387, 582.5), accent);
add('rear-beater-0', cylinder(667, 22, 8).translate(-360, -946, 65), accent);
add('rear-beater-1', cylinder(667, 22, 8).translate(-180, -946, 65), accent);
add('rear-beater-2', cylinder(667, 22, 8).translate(0, -946, 65), accent);
add('rear-beater-3', cylinder(667, 22, 8).translate(180, -946, 65), accent);
add('rear-beater-4', cylinder(667, 22, 8).translate(360, -946, 65), accent);
add('wagon-wheel--1', cylinder(90, 250, 12).rotate([0, 1, 0], 90).translate(-217, -552, 250), "#414848");
add('wagon-wheel--1-hub', cylinder(99, 85, 10).translate(-221.5, -552, 250), accent);
add('wagon-wheel-1', cylinder(90, 250, 12).rotate([0, 1, 0], 90).translate(-217, 552, 250), "#414848");
add('wagon-wheel-1-hub', cylinder(99, 85, 10).translate(-221.5, 552, 250), accent);
add('drawbar', box(92, 967.5, 60, true).translate(0, 1247, 135), body);

return p.model();
