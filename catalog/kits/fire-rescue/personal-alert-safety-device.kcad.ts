// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly personal alert safety device scene prop, modeled from scratch.
meta({
  name: "personal-alert-safety-device",
  license: 'CC0-1.0',
  title: "Personal alert safety device",
  description: "Compact firefighter alarm clipped to a harness with grille, controls and indicator. Knobs: overall scale, body color and accent color.",
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
const p = assembly("personal-alert-safety-device");
const groundOffset = -100;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("alarm-case", box(220, 140, 195, true).translate(0, 0, 197.5), accent);
add("clip", box(105, 24, 105, true).translate(0, 90, 177.5), body);
add("alarm-grille", cylinder(22, 54, 8).rotate([1, 0, 0], 90).translate(0, -74, 210), body);
add("indicator", cylinder(20, 22, 8).rotate([1, 0, 0], 90).translate(72, -85, 260), body);
add("test-button", box(45, 28, 22, true).translate(-65, -78, 283), body);

return p.model();
