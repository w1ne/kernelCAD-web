// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire hose nozzle scene prop, modeled from scratch.
meta({
  name: "fire-hose-nozzle",
  license: 'CC0-1.0',
  title: "Fire hose nozzle",
  description: "Straight hose nozzle with hand grip, barrel and adjustable front tip. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-hose-nozzle");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(80.6, 45, 10).rotate([0, 1, 0], 90).translate(-111.6, 0, 54), accent);
add("nozzle-body", cylinder(145.7, 34, 10).rotate([0, 1, 0], 90).translate(-9.3, 0, 54), body);
add("tip", cylinder(55.8, 22, 10).rotate([0, 1, 0], 90).translate(99.2, 0, 54), accent);
add("handle", box(40, 100, 32, true).translate(-31, 0, 16), accent);

return p.model();
