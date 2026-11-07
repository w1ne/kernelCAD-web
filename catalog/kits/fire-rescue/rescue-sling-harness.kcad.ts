// SPDX-License-Identifier: CC0-1.0
// Folded rope rescue harness with shoulder loops, waist belt and leg straps. Material controls: safety trim, protective fabric; weathered and highVisibility presets.
meta({
  name: "rescue-sling-harness",
  license: 'CC0-1.0',
  title: "Rescue sling harness",
  description: "Folded rope rescue harness with shoulder loops, waist belt and leg straps. Material controls: safety trim, protective fabric; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyTrimColor = param('safetyTrimColor', '#e4cc55', { label: 'Safety trim' });
const fabricColor = param('fabricColor', '#c34b35', { label: 'Protective fabric' });
presets({
  weathered: { safetyTrimColor: '#b2a04e', fabricColor: '#8c5545' },
  highVisibility: { safetyTrimColor: '#f0df67', fabricColor: '#d67e2d' },
});
const p = assembly("rescue-sling-harness");
const groundOffset = -93;
const add = (name, shape, finish = fabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("waist-belt", box(440, 70, 72, true).translate(0, 0, 246.8), safetyTrimColor);
add("shoulder-strap--1", box(78, 80, 341, true).rotateY(-14).translate(-105.6, 0, 585.9), fabricColor);
add("leg-loop--1", box(190, 75, 42, true).translate(-118.8, 0, 114), safetyTrimColor);
add("shoulder-strap-1", box(78, 80, 341, true).rotateY(14).translate(105.6, 0, 585.9), fabricColor);
add("leg-loop-1", box(190, 75, 42, true).translate(118.8, 0, 114), safetyTrimColor);
add("back-pad", box(210, 55, 248, true).translate(0, 28, 496), fabricColor);
add("front-buckle", box(90, 35, 60, true).translate(0, -50, 247), safetyTrimColor);

return p.model();
