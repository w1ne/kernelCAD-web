// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly structural fire boots scene prop, modeled from scratch.
meta({
  name: "structural-fire-boots",
  license: 'CC0-1.0',
  title: "Structural fire boots",
  description: "Pair of tall protective boots with raised shafts, soles and broad toe guards. Knobs: overall scale, body color and accent color.",
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
const p = assembly("structural-fire-boots");
const groundOffset = -60;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("boot-shaft--1", box(220, 205, 340, true).translate(0, -135, 360), body);
add("boot-foot--1", box(380, 220, 120, true).translate(90, -135, 120), accent);
add("boot-toe--1", box(120, 210, 110, true).translate(240, -135, 141), body);
add("boot-shaft-1", box(220, 205, 340, true).translate(0, 135, 360), body);
add("boot-foot-1", box(380, 220, 120, true).translate(90, 135, 120), accent);
add("boot-toe-1", box(120, 210, 110, true).translate(240, 135, 141), body);

return p.model();
