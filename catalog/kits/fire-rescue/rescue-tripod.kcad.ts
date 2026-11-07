// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rescue tripod scene prop, modeled from scratch.
meta({
  name: "rescue-tripod",
  license: 'CC0-1.0',
  title: "Rescue tripod",
  description: "Three-leg rescue tripod with top pulley housing, cable wheel and foot pads. Knobs: overall scale, body color and accent color.",
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
const p = assembly("rescue-tripod");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("top-head", box(190, 190, 110, true).translate(0, 0, 1207), accent);
add("leg-0", box(60, 60, 1126.4, true).rotate([1.0, 0.0, 0], 17).translate(310, 0, 1100.8), body);
add("foot-0", box(170, 120, 36, true).rotate([0, 0, 1], 0).translate(390, 0, 36), accent);
add("leg-1", box(60, 60, 1126.4, true).rotate([-0.4999999999999998, 0.8660254037844387, 0], 17).translate(-155, 268.468, 1100.8), body);
add("foot-1", box(170, 120, 36, true).rotate([0, 0, 1], 120).translate(-195, 337.75, 36), accent);
add("leg-2", box(60, 60, 1126.4, true).rotate([-0.5000000000000004, -0.8660254037844384, 0], 17).translate(-155, -268.468, 1100.8), body);
add("foot-2", box(170, 120, 36, true).rotate([0, 0, 1], 240).translate(-195, -337.75, 36), accent);
add("pulley", cylinder(160, 55, 8).rotate([1, 0, 0], 90).translate(0, 0, 1250.4), body);
add("hook", cylinder(120, 20, 8).translate(0, 0, 0), accent);

return p.model();
