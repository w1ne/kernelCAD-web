// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly firefighter turnout pants scene prop, modeled from scratch.
meta({
  name: "firefighter-turnout-pants",
  license: 'CC0-1.0',
  title: "Firefighter turnout pants",
  description: "Protective trouser form with suspenders, articulated legs and reflective cuffs. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("firefighter-turnout-pants");
const groundOffset = -34;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("trouser-leg--1", box(220, 190, 455, true).translate(0, -120, 467.5), body);
add("trouser-cuff--1", box(240, 205, 58, true).translate(0, -120, 63), accent);
add("reflective-cuff--1", box(226, 198, 30, true).translate(0, -120, 110), accent);
add("trouser-leg-1", box(220, 190, 455, true).translate(0, 120, 467.5), body);
add("trouser-cuff-1", box(240, 205, 58, true).translate(0, 120, 63), accent);
add("reflective-cuff-1", box(226, 198, 30, true).translate(0, 120, 110), accent);
add("waistband", box(470, 340, 75, true).translate(0, 0, 522.5), accent);
add("suspender--1", box(42, 48, 260, true).translate(0, -120, 730), body);
add("suspender-1", box(42, 48, 260, true).translate(0, 120, 730), body);

return p.model();
