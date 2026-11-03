// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly firefighter turnout coat scene prop, modeled from scratch.
meta({
  name: "firefighter-turnout-coat",
  license: 'CC0-1.0',
  title: "Firefighter turnout coat",
  description: "Protective coat form with raised collar, sleeves, front closure and reflective bands. Knobs: overall scale, body color and accent color.",
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
const p = assembly("firefighter-turnout-coat");
const groundOffset = -260;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("coat-torso", box(490, 250, 570, true).translate(0, 0, 585), body);
add("raised-collar", box(290, 245, 110, true).translate(0, 0, 650), accent);
add("coat-sleeve--1", box(560, 130, 240, true).rotate([1, 0, 0], -12).translate(0, -210, 440), accent);
add("coat-sleeve-1", box(560, 130, 240, true).rotate([1, 0, 0], 12).translate(0, 210, 440), accent);
add("coat-reflective-band-260", box(505, 260, 30, true).translate(0, 0, 275), accent);
add("coat-reflective-band-370", box(505, 260, 30, true).translate(0, 0, 385), accent);
add("coat-reflective-band-480", box(505, 260, 30, true).translate(0, 0, 495), accent);
add("front-closure", box(35, 28, 420, true).translate(235, 0, 520), accent);

return p.model();
