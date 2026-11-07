// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly roof hook ladder scene prop, modeled from scratch.
meta({
  name: "roof-hook-ladder",
  license: 'CC0-1.0',
  title: "Roof hook ladder",
  description: "Compact roof ladder with ridge hooks, reinforced rails and closely spaced rungs. Knobs: overall scale, body color and accent color.",
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
const p = assembly("roof-hook-ladder");
const groundOffset = -54.6;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("ladder-rail--1", box(920, 42, 48, true).translate(0, -133.2, 78.6), accent);
add("ladder-rail-1", box(920, 42, 48, true).translate(0, 133.2, 78.6), accent);
add("ladder-rung-0", box(26, 266.4, 26, true).translate(-395.6, 0, 67.6), body);
add("ladder-rung-1", box(26, 266.4, 26, true).translate(-263.733, 0, 67.6), body);
add("ladder-rung-2", box(26, 266.4, 26, true).translate(-131.867, 0, 67.6), body);
add("ladder-rung-3", box(26, 266.4, 26, true).translate(0, 0, 67.6), body);
add("ladder-rung-4", box(26, 266.4, 26, true).translate(131.867, 0, 67.6), body);
add("ladder-rung-5", box(26, 266.4, 26, true).translate(263.733, 0, 67.6), body);
add("ladder-rung-6", box(26, 266.4, 26, true).translate(395.6, 0, 67.6), body);
add("ridge-hook--1", box(155, 35, 32, true).rotate([0, 1, 0], -35).translate(414, -133.2, 175.6), body);
add("ridge-hook-1", box(155, 35, 32, true).rotate([0, 1, 0], 35).translate(414, 133.2, 175.6), body);

return p.model();
