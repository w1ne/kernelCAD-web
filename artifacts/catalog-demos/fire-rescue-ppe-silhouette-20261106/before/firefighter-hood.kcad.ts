// SPDX-License-Identifier: CC0-1.0
// Folded protective hood with neck drape, face opening and layered fabric edges. Material controls: protective fabric, safety trim; weathered and highVisibility presets.
meta({
  name: "firefighter-hood",
  license: 'CC0-1.0',
  title: "Firefighter protective hood",
  description: "Folded protective hood with neck drape, face opening and layered fabric edges. Material controls: protective fabric, safety trim; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const fabricColor = param('fabricColor', '#c34b35', { label: 'Protective fabric' });
const safetyTrimColor = param('safetyTrimColor', '#e4cc55', { label: 'Safety trim' });
presets({
  weathered: { fabricColor: '#8c5545', safetyTrimColor: '#b2a04e' },
  highVisibility: { fabricColor: '#d67e2d', safetyTrimColor: '#f0df67' },
});
const p = assembly("firefighter-hood");
const groundOffset = -28;
const add = (name, shape, finish = fabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hood-neck-drape", box(390, 340, 190, true).translate(0, 0, 195), fabricColor);
add("hood-crown", box(300, 300, 270, true).translate(0, 0, 405), safetyTrimColor);
add("face-opening", box(175, 24, 125, true).translate(0, -158, 352.5), fabricColor);
add("hem-band", box(410, 360, 40, true).translate(0, 0, 48), safetyTrimColor);

return p.model();
