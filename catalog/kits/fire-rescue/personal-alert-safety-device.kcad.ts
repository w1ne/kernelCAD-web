// SPDX-License-Identifier: CC0-1.0
// Compact firefighter alarm clipped to a harness with grille, controls and indicator. Material controls: equipment housing, metal controls, display glass; weathered and highVisibility presets.
meta({
  name: "personal-alert-safety-device",
  license: 'CC0-1.0',
  title: "Personal alert safety device",
  description: "Compact firefighter alarm clipped to a harness with grille, controls and indicator. Material controls: equipment housing, metal controls, display glass; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const housingPolymerColor = param('housingPolymerColor', '#424c54', { label: 'Equipment housing' });
const metalHardwareColor = param('metalHardwareColor', '#aeb8bc', { label: 'Metal controls' });
const displayGlassColor = param('displayGlassColor', '#4c8595', { label: 'Display glass' });
presets({
  weathered: { housingPolymerColor: '#4a4943', metalHardwareColor: '#879194', displayGlassColor: '#526f76' },
  highVisibility: { housingPolymerColor: '#d07c2d', metalHardwareColor: '#c5c9b8', displayGlassColor: '#69a9ae' },
});
const p = assembly("personal-alert-safety-device");
const groundOffset = -100;
const add = (name, shape, finish = housingPolymerColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("alarm-case", box(220, 140, 195, true).translate(0, 0, 197.5), housingPolymerColor);
add("clip", box(105, 24, 105, true).translate(0, 90, 177.5), metalHardwareColor);
add("alarm-grille", cylinder(22, 54, 8).rotateX(90).translate(0, -74, 210), metalHardwareColor);
add("indicator", cylinder(20, 22, 8).rotateX(90).translate(72, -85, 260), displayGlassColor);
add("test-button", box(45, 28, 22, true).translate(-65, -78, 283), metalHardwareColor);

return p.model();
