// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly firefighter breathing facepiece scene prop, modeled from scratch.
meta({
  name: "firefighter-facepiece",
  license: 'CC0-1.0',
  title: "Firefighter breathing facepiece",
  description: "Respiratory facepiece with broad lens, cheek ports, lower filter and straps. Knobs: overall scale, body color and accent color.",
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
const p = assembly("firefighter-facepiece");
const groundOffset = -80;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("mask-frame", box(300, 115, 250, true).translate(0, 0, 295), accent);
add("lens", box(180, 28, 100, true).translate(70, -65, 285), body);
add("left-port", cylinder(85, 48, 8).translate(-110, 0, 145), body);
add("right-port", cylinder(85, 48, 8).translate(110, 0, 145), body);
add("lower-regulator", box(140, 65, 75, true).translate(0, -100, 117.5), accent);
add("strap--1", box(110, 25, 24, true).translate(-185, 0, 257), body);
add("strap-1", box(110, 25, 24, true).translate(185, 0, 257), body);

return p.model();
