// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly smooth bore fire nozzle scene prop, modeled from scratch.
meta({
  name: "smooth-bore-nozzle",
  license: 'CC0-1.0',
  title: "Smooth bore fire nozzle",
  description: "Simple smooth-bore tip with tapered barrel and hose coupling tail. Knobs: overall scale, body color and accent color.",
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
const p = assembly("smooth-bore-nozzle");
const groundOffset = -9;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(65, 45, 10).rotate([0, 1, 0], 90).translate(-90, 0, 54), accent);
add("nozzle-body", cylinder(117.5, 34, 10).rotate([0, 1, 0], 90).translate(-7.5, 0, 54), body);
add("tip", cylinder(45, 22, 10).rotate([0, 1, 0], 90).translate(80, 0, 54), accent);

return p.model();
