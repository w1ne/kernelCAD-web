// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire blanket canister scene prop, modeled from scratch.
meta({
  name: "fire-blanket-canister",
  license: 'CC0-1.0',
  title: "Fire blanket canister",
  description: "Wall-mountable fire blanket case with pull tab, cover panel and mounting plate. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-blanket-canister");
const groundOffset = -145;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("mounting-plate", box(370, 45, 520, true).translate(0, 30, 560), body);
add("case", box(340, 230, 460, true).translate(0, -10, 530), accent);
add("case-lid", box(300, 30, 420, true).translate(0, -135, 510), body);
add("pull-tab", box(95, 30, 60, true).translate(0, -170, 175), accent);

return p.model();
