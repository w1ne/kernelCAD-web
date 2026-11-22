// SPDX-License-Identifier: CC0-1.0
// Compact roof ladder with ridge hooks, reinforced rails and closely spaced rungs. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.
meta({
  name: "roof-hook-ladder",
  license: 'CC0-1.0',
  title: "Roof hook ladder",
  description: "Compact roof ladder with ridge hooks, reinforced rails and closely spaced rungs. Material controls: aluminum rails, safety finish, ladder hardware; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const aluminumColor = param('aluminumColor', '#aeb8ba', { label: 'Aluminum rails' });
const safetyFinishColor = param('safetyFinishColor', '#e0ad32', { label: 'Safety finish' });
const hardwareColor = param('hardwareColor', '#68777c', { label: 'Ladder hardware' });
presets({
  weathered: { aluminumColor: '#899496', safetyFinishColor: '#ad7730', hardwareColor: '#596568' },
  highVisibility: { aluminumColor: '#d4d2bd', safetyFinishColor: '#f2d34d', hardwareColor: '#aeb9bc' },
});
const p = assembly("roof-hook-ladder");
const groundOffset = -54.6;
const add = (name, shape, finish = aluminumColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("ladder-rail--1", box(920, 42, 48, true).translate(0, -133.2, 78.6), aluminumColor);
add("ladder-rail-1", box(920, 42, 48, true).translate(0, 133.2, 78.6), aluminumColor);
add("ladder-rung-0", box(26, 266.4, 26, true).translate(-395.6, 0, 67.6), safetyFinishColor);
add("ladder-rung-1", box(26, 266.4, 26, true).translate(-263.733, 0, 67.6), safetyFinishColor);
add("ladder-rung-2", box(26, 266.4, 26, true).translate(-131.867, 0, 67.6), safetyFinishColor);
add("ladder-rung-3", box(26, 266.4, 26, true).translate(0, 0, 67.6), safetyFinishColor);
add("ladder-rung-4", box(26, 266.4, 26, true).translate(131.867, 0, 67.6), safetyFinishColor);
add("ladder-rung-5", box(26, 266.4, 26, true).translate(263.733, 0, 67.6), safetyFinishColor);
add("ladder-rung-6", box(26, 266.4, 26, true).translate(395.6, 0, 67.6), safetyFinishColor);
add("ridge-hook--1", box(155, 35, 32, true).rotateY(-35).translate(414, -133.2, 175.6), hardwareColor);
add("ridge-hook-1", box(155, 35, 32, true).rotateY(35).translate(414, 133.2, 175.6), hardwareColor);

return p.model();
