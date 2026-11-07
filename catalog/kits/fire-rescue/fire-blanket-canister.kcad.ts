// SPDX-License-Identifier: CC0-1.0
// Wall-mountable fire blanket case with pull tab, cover panel and mounting plate. Material controls: protective fabric, safety trim; weathered and highVisibility presets.
meta({
  name: "fire-blanket-canister",
  license: 'CC0-1.0',
  title: "Fire blanket canister",
  description: "Wall-mountable fire blanket case with pull tab, cover panel and mounting plate. Material controls: protective fabric, safety trim; weathered and highVisibility presets.",
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
const p = assembly("fire-blanket-canister");
const groundOffset = -145;
const add = (name, shape, finish = fabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("mounting-plate", box(370, 45, 520, true).translate(0, 30, 560), fabricColor);
add("case", box(340, 230, 460, true).translate(0, -10, 530), safetyTrimColor);
add("case-lid", box(300, 30, 420, true).translate(0, -135, 510), fabricColor);
add("pull-tab", box(95, 30, 60, true).translate(0, -170, 175), safetyTrimColor);

return p.model();
