// SPDX-License-Identifier: CC0-1.0
// Respiratory facepiece with broad lens, cheek ports, lower filter and straps. Material controls: display glass, metal controls, rubber grip, equipment housing; weathered and highVisibility presets.
meta({
  name: "firefighter-facepiece",
  license: 'CC0-1.0',
  title: "Firefighter breathing facepiece",
  description: "Respiratory facepiece with broad lens, cheek ports, lower filter and straps. Material controls: display glass, metal controls, rubber grip, equipment housing; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const displayGlassColor = param('displayGlassColor', '#4c8595', { label: 'Display glass' });
const metalHardwareColor = param('metalHardwareColor', '#aeb8bc', { label: 'Metal controls' });
const gripRubberColor = param('gripRubberColor', '#252a2e', { label: 'Rubber grip' });
const housingPolymerColor = param('housingPolymerColor', '#424c54', { label: 'Equipment housing' });
presets({
  weathered: { displayGlassColor: '#526f76', metalHardwareColor: '#879194', gripRubberColor: '#3a3c3a', housingPolymerColor: '#4a4943' },
  highVisibility: { displayGlassColor: '#69a9ae', metalHardwareColor: '#c5c9b8', gripRubberColor: '#252a2e', housingPolymerColor: '#d07c2d' },
});
const p = assembly("firefighter-facepiece");
const groundOffset = -80;
const add = (name, shape, finish = housingPolymerColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("mask-frame", box(300, 115, 250, true).translate(0, 0, 295), displayGlassColor);
add("lens", box(180, 28, 100, true).translate(70, -65, 285), displayGlassColor);
add("left-port", cylinder(85, 48, 8).translate(-110, 0, 145), metalHardwareColor);
add("right-port", cylinder(85, 48, 8).translate(110, 0, 145), metalHardwareColor);
add("lower-regulator", box(140, 65, 75, true).translate(0, -100, 117.5), displayGlassColor);
add("strap--1", box(110, 25, 24, true).translate(-185, 0, 257), gripRubberColor);
add("strap-1", box(110, 25, 24, true).translate(185, 0, 257), gripRubberColor);

return p.model();
