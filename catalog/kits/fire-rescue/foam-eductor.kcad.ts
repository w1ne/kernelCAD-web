// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire foam eductor scene prop, modeled from scratch.
meta({
  name: "foam-eductor",
  license: 'CC0-1.0',
  title: "Fire foam eductor",
  description: "Inline foam proportioning body with pickup tube, selector dial and hose couplings. Knobs: overall scale, body color and accent color.",
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
const p = assembly("foam-eductor");
const groundOffset = 2;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("eductor-body", cylinder(460, 54, 10).rotate([0, 1, 0], 90).translate(0, 0, 70), body);
add("inlet-coupling", cylinder(125, 72, 10).rotate([0, 1, 0], 90).translate(275, 0, 70), accent);
add("outlet-coupling", cylinder(125, 72, 10).rotate([0, 1, 0], 90).translate(-275, 0, 70), accent);
add("proportioning-dial", box(78, 75, 80, true).translate(0, 0, 165), accent);
add("pickup-hose", cylinder(240, 18, 10).translate(0, 125, 20), body);

return p.model();
