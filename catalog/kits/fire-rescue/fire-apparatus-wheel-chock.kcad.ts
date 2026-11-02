// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire apparatus wheel chock scene prop, modeled from scratch.
meta({
  name: "fire-apparatus-wheel-chock",
  license: 'CC0-1.0',
  title: "Fire apparatus wheel chock",
  description: "High-visibility wedge chock with ribbed tread, pull loop and broad ground face. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-apparatus-wheel-chock");
const groundOffset = -16.879;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("wedge", box(420, 230, 150, true).rotate([0, 1, 0], 17).translate(0, 0, 150), accent);
add("tread-rib-0", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(-150, 0, 139), body);
add("tread-rib-1", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(-95, 0, 139), body);
add("tread-rib-2", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(-40, 0, 139), body);
add("tread-rib-3", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(15, 0, 139), body);
add("tread-rib-4", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(70, 0, 139), body);
add("tread-rib-5", box(24, 240, 28, true).rotate([0, 1, 0], 17).translate(125, 0, 139), body);
add("pull-loop", box(80, 45, 32, true).translate(-220, 0, 206), body);

return p.model();
