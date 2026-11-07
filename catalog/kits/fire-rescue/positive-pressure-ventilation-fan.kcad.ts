// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly positive pressure ventilation fan scene prop, modeled from scratch.
meta({
  name: "positive-pressure-ventilation-fan",
  license: 'CC0-1.0',
  title: "Positive pressure ventilation fan",
  description: "Angled fan assembly with protective ring, radial blades, handle and folding stand. Knobs: overall scale, body color and accent color.",
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
const p = assembly("positive-pressure-ventilation-fan");
const groundOffset = -5;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("fan-frame", box(510, 230, 330, true).translate(0, 0, 330), accent);
add("fan-hub", cylinder(42, 65, 8).rotate([1, 0, 0], 90).translate(0, -135, 190), body);
add("fan-blade-0", box(210, 50, 28, true).rotate([1, 0, 0], 0).translate(0, -115, 204), body);
add("fan-blade-1", box(210, 50, 28, true).rotate([1, 0, 0], 60).translate(0, -115, 204), body);
add("fan-blade-2", box(210, 50, 28, true).rotate([1, 0, 0], 120).translate(0, -115, 204), body);
add("fan-blade-3", box(210, 50, 28, true).rotate([1, 0, 0], 180).translate(0, -115, 204), body);
add("fan-blade-4", box(210, 50, 28, true).rotate([1, 0, 0], 240).translate(0, -115, 204), body);
add("fan-blade-5", box(210, 50, 28, true).rotate([1, 0, 0], 300).translate(0, -115, 204), body);
add("guard-ring", cylinder(24, 185, 12).rotate([1, 0, 0], 90).translate(0, -150, 190), body);
add("handle", box(250, 45, 40, true).translate(0, 0, 385), body);
add("angled-stand", box(48, 48, 190, true).rotate([0, 1, 0], -18).translate(-140, 0, 120), body);
add("fuel-tank", box(150, 150, 75, true).translate(170, 0, 67.5), accent);

return p.model();
