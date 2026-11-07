// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly structural fire helmet scene prop, modeled from scratch.
meta({
  name: "structural-fire-helmet",
  license: 'CC0-1.0',
  title: "Structural fire helmet",
  description: "Structural helmet with brim, raised shell, ear flaps, face shield and front shield plate. Knobs: overall scale, body color and accent color.",
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
const p = assembly("structural-fire-helmet");
const groundOffset = -35;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("helmet-brim", cylinder(32, 250, 12).translate(0, 0, 130), accent);
add("helmet-shell", cylinder(170, 165, 12).translate(0, 0, 160), body);
add("front-shield", box(115, 30, 90, true).translate(0, -160, 255), accent);
add("face-shield", box(185, 20, 105, true).translate(0, -190, 147.5), body);
add("ear-flap--1", box(65, 170, 120, true).translate(-185, 0, 165), accent);
add("chin-strap--1", box(35, 40, 105, true).translate(-110, -15, 87.5), body);
add("ear-flap-1", box(65, 170, 120, true).translate(185, 0, 165), accent);
add("chin-strap-1", box(35, 40, 105, true).translate(110, -15, 87.5), body);

return p.model();
