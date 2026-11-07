// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly hydraulic rescue ram scene prop, modeled from scratch.
meta({
  name: "hydraulic-rescue-ram",
  license: 'CC0-1.0',
  title: "Hydraulic rescue ram",
  description: "Telescoping rescue ram with piston body, end plates and hose connection. Knobs: overall scale, body color and accent color.",
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
const p = assembly("hydraulic-rescue-ram");
const groundOffset = -30;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tool-body", box(352.8, 110, 125, true).translate(-67.2, 0, 152.5), body);
add("rear-handle", box(90, 230, 45, true).translate(-310.8, 0, 177.5), accent);
add("front-handle", box(240, 42, 50, true).translate(-100.8, 0, 55), accent);
add("pivot", cylinder(70, 75, 8).translate(100.8, 0, 155), accent);
add("ram-cylinder", box(352.8, 84, 92, true).translate(235.2, 0, 196), accent);
add("ram-piston", box(235.2, 52, 58, true).translate(453.6, 0, 184), body);
add("ram-foot", box(68, 150, 120, true).translate(588, 0, 190), accent);

return p.model();
