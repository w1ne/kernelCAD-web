// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly firefighter protective hood scene prop, modeled from scratch.
meta({
  name: "firefighter-hood",
  license: 'CC0-1.0',
  title: "Firefighter protective hood",
  description: "Folded protective hood with neck drape, face opening and layered fabric edges. Knobs: overall scale, body color and accent color.",
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
const p = assembly("firefighter-hood");
const groundOffset = -28;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hood-neck-drape", box(390, 340, 190, true).translate(0, 0, 195), body);
add("hood-crown", box(300, 300, 270, true).translate(0, 0, 405), accent);
add("face-opening", box(175, 24, 125, true).translate(0, -158, 352.5), body);
add("hem-band", box(410, 360, 40, true).translate(0, 0, 48), accent);

return p.model();
