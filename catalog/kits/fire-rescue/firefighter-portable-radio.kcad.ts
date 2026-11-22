// SPDX-License-Identifier: CC0-1.0
// Handheld radio with antenna, channel knob, speaker grille and shoulder mic. Material controls: equipment housing, metal controls, display glass; weathered and highVisibility presets.
meta({
  name: "firefighter-portable-radio",
  license: 'CC0-1.0',
  title: "Firefighter portable radio",
  description: "Handheld radio with antenna, channel knob, speaker grille and shoulder mic. Material controls: equipment housing, metal controls, display glass; weathered and highVisibility presets.",
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
const p = assembly("firefighter-portable-radio");
const groundOffset = -180;
const add = (name, shape, finish = housingPolymerColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("radio-body", box(190, 115, 360, true).translate(0, 0, 360), housingPolymerColor);
add("antenna", cylinder(220, 12, 8).translate(-65, 0, 540), metalHardwareColor);
add("channel-knob", cylinder(35, 32, 8).translate(75, -42, 565), metalHardwareColor);
add("speaker-slot-0", box(96, 16, 10, true).translate(0, -62, 325), displayGlassColor);
add("speaker-slot-1", box(96, 16, 10, true).translate(0, -62, 350), displayGlassColor);
add("speaker-slot-2", box(96, 16, 10, true).translate(0, -62, 375), displayGlassColor);
add("speaker-slot-3", box(96, 16, 10, true).translate(0, -62, 400), displayGlassColor);
add("speaker-slot-4", box(96, 16, 10, true).translate(0, -62, 425), displayGlassColor);
add("display", box(100, 18, 48, true).translate(0, -62, 514), displayGlassColor);
add("shoulder-mic", cylinder(120, 28, 10).rotateY(90).translate(140, 55, 400), housingPolymerColor);

return p.model();
