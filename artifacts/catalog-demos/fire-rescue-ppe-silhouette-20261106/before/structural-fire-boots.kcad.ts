// SPDX-License-Identifier: CC0-1.0
// Pair of tall protective boots with raised shafts, soles and broad toe guards. Material controls: protective leather, sole rubber; weathered and highVisibility presets.
meta({
  name: "structural-fire-boots",
  license: 'CC0-1.0',
  title: "Structural fire boots",
  description: "Pair of tall protective boots with raised shafts, soles and broad toe guards. Material controls: protective leather, sole rubber; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const leatherColor = param('leatherColor', '#49372c', { label: 'Protective leather' });
const soleRubberColor = param('soleRubberColor', '#292e31', { label: 'Sole rubber' });
presets({
  weathered: { leatherColor: '#3c322d', soleRubberColor: '#3c3e3c' },
  highVisibility: { leatherColor: '#574433', soleRubberColor: '#292e31' },
});
const p = assembly("structural-fire-boots");
const groundOffset = -60;
const add = (name, shape, finish = leatherColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("boot-shaft--1", box(220, 205, 340, true).translate(0, -135, 360), leatherColor);
add("boot-foot--1", box(380, 220, 120, true).translate(90, -135, 120), soleRubberColor);
add("boot-toe--1", box(120, 210, 110, true).translate(240, -135, 141), leatherColor);
add("boot-shaft-1", box(220, 205, 340, true).translate(0, 135, 360), leatherColor);
add("boot-foot-1", box(380, 220, 120, true).translate(90, 135, 120), soleRubberColor);
add("boot-toe-1", box(120, 210, 110, true).translate(240, 135, 141), leatherColor);

return p.model();
