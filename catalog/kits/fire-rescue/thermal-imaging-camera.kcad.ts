// SPDX-License-Identifier: CC0-1.0
// Handheld thermal camera with display, lens barrel, grip and top controls. Material controls: equipment housing, display glass, rubber grip; weathered and highVisibility presets.
meta({
  name: "thermal-imaging-camera",
  license: 'CC0-1.0',
  title: "Thermal imaging camera",
  description: "Handheld thermal camera with display, lens barrel, grip and top controls. Material controls: equipment housing, display glass, rubber grip; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const housingPolymerColor = param('housingPolymerColor', '#424c54', { label: 'Equipment housing' });
const displayGlassColor = param('displayGlassColor', '#4c8595', { label: 'Display glass' });
const gripRubberColor = param('gripRubberColor', '#252a2e', { label: 'Rubber grip' });
presets({
  weathered: { housingPolymerColor: '#4a4943', displayGlassColor: '#526f76', gripRubberColor: '#3a3c3a' },
  highVisibility: { housingPolymerColor: '#d07c2d', displayGlassColor: '#69a9ae', gripRubberColor: '#252a2e' },
});
const p = assembly("thermal-imaging-camera");
const groundOffset = -20;
const add = (name, shape, finish = housingPolymerColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("camera-body", box(350, 250, 210, true).translate(0, 0, 265), housingPolymerColor);
add("display", box(190, 25, 110, true).translate(-30, -138, 340), displayGlassColor);
add("thermal-lens", cylinder(105, 62, 10).rotateY(90).translate(150, -85, 215), displayGlassColor);
add("grip", box(130, 190, 110, true).translate(-30, 0, 75), gripRubberColor);
add("top-control", cylinder(26, 36, 8).translate(-90, 0, 295), housingPolymerColor);

return p.model();
