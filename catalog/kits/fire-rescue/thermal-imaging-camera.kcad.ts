// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly thermal imaging camera scene prop, modeled from scratch.
meta({
  name: "thermal-imaging-camera",
  license: 'CC0-1.0',
  title: "Thermal imaging camera",
  description: "Handheld thermal camera with display, lens barrel, grip and top controls. Knobs: overall scale, body color and accent color.",
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
const p = assembly("thermal-imaging-camera");
const groundOffset = -20;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("camera-body", box(350, 250, 210, true).translate(0, 0, 265), body);
add("display", box(190, 25, 110, true).translate(-30, -138, 340), accent);
add("thermal-lens", cylinder(105, 62, 10).rotate([0, 1, 0], 90).translate(150, -85, 215), accent);
add("grip", box(130, 190, 110, true).translate(-30, 0, 75), accent);
add("top-control", cylinder(26, 36, 8).translate(-90, 0, 295), body);

return p.model();
