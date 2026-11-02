// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rescue sling harness scene prop, modeled from scratch.
meta({
  name: "rescue-sling-harness",
  license: 'CC0-1.0',
  title: "Rescue sling harness",
  description: "Folded rope rescue harness with shoulder loops, waist belt and leg straps. Knobs: overall scale, body color and accent color.",
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
const p = assembly("rescue-sling-harness");
const groundOffset = -93;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("waist-belt", box(440, 70, 72, true).translate(0, 0, 246.8), accent);
add("shoulder-strap--1", box(78, 80, 341, true).rotate([0, 1, 0], -14).translate(-105.6, 0, 585.9), body);
add("leg-loop--1", box(190, 75, 42, true).translate(-118.8, 0, 114), accent);
add("shoulder-strap-1", box(78, 80, 341, true).rotate([0, 1, 0], 14).translate(105.6, 0, 585.9), body);
add("leg-loop-1", box(190, 75, 42, true).translate(118.8, 0, 114), accent);
add("back-pad", box(210, 55, 248, true).translate(0, 28, 496), body);
add("front-buckle", box(90, 35, 60, true).translate(0, -50, 247), accent);

return p.model();
