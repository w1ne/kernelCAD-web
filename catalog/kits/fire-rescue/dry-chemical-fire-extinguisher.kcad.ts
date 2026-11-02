// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly dry chemical fire extinguisher scene prop, modeled from scratch.
meta({
  name: "dry-chemical-fire-extinguisher",
  license: 'CC0-1.0',
  title: "Dry chemical fire extinguisher",
  description: "Portable extinguisher with pressure cylinder, hose, gauge and squeeze handle. Knobs: overall scale, body color and accent color.",
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
const p = assembly("dry-chemical-fire-extinguisher");
const groundOffset = -40;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pressure-vessel", cylinder(470, 125, 10).translate(0, 0, 60), accent);
add("base-ring", cylinder(45, 132, 10).translate(0, 0, 40), body);
add("valve-neck", cylinder(55, 45, 8).translate(0, 0, 530), body);
add("handle-bracket", box(125, 32, 35, true).translate(0, 0, 627.5), body);
add("squeeze-lever", box(150, 30, 24, true).translate(40, 0, 658), accent);
add("gauge", cylinder(18, 38, 8).rotate([1, 0, 0], 90).translate(38, -38, 585), body);
add("hose", cylinder(150, 20, 10).rotate([0, 1, 0], 90).translate(-125, 0, 420), body);
add("nozzle", box(70, 34, 32, true).translate(-210, 0, 436), accent);

return p.model();
