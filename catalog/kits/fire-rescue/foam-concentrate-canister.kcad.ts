// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly foam concentrate canister scene prop, modeled from scratch.
meta({
  name: "foam-concentrate-canister",
  license: 'CC0-1.0',
  title: "Foam concentrate canister",
  description: "Portable concentrate can with handle frame, cap and short pickup fitting. Knobs: overall scale, body color and accent color.",
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
const p = assembly("foam-concentrate-canister");
const groundOffset = -45;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("canister", cylinder(390, 145, 10).translate(0, 0, 45), accent);
add("handle", box(210, 48, 30, true).translate(0, 0, 445), body);
add("cap", cylinder(55, 54, 8).translate(0, 0, 435), body);
add("pickup-fitting", cylinder(120, 32, 10).rotate([0, 1, 0], 90).translate(130, 0, 115), body);

return p.model();
