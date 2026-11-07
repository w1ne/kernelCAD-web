// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vehicle stabilization strut scene prop, modeled from scratch.
meta({
  name: "vehicle-stabilization-strut",
  license: 'CC0-1.0',
  title: "Vehicle stabilization strut",
  description: "Adjustable rescue support strut with foot plates, telescoping sections and ratchet. Knobs: overall scale, body color and accent color.",
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
const p = assembly("vehicle-stabilization-strut");
const groundOffset = -18;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("base-plate", box(250, 250, 36, true).translate(0, 0, 36), body);
add("outer-strut", cylinder(646.8, 68, 8).translate(0, 0, 55), accent);
add("inner-strut", cylinder(294, 38, 8).translate(0, 0, 607.6), body);
add("ratchet-handle", box(180, 38, 34, true).translate(90, 0, 536.4), accent);
add("top-pad", box(230, 230, 40, true).translate(0, 0, 902), body);

return p.model();
