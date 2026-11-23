// SPDX-License-Identifier: CC0-1.0
// Portable drum mixer with reinforced frame, tilting cradle and transport wheels.
meta({
  name: "masonry-mixer",
  license: 'CC0-1.0',
  title: "Masonry mortar mixer",
  description: "Portable drum mixer with reinforced frame, tilting cradle and transport wheels. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('masonry-mixer');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('mixer-wheel--1', cylinder(76, 150, 12).rotateX(90).translate(-262.4, -250.6, 150), tireRubberColor);
add('mixer-wheel--1-hub--1', cylinder(12.16, 57, 10).rotateX(90).translate(-262.4, -332.68, 150), structuralSteelColor);
add('mixer-wheel--1-hub-1', cylinder(12.16, 57, 10).rotateX(90).translate(-262.4, -244.52, 150), structuralSteelColor);
add('mixer-wheel-1', cylinder(76, 150, 12).rotateX(90).translate(-262.4, 326.6, 150), tireRubberColor);
add('mixer-wheel-1-hub--1', cylinder(12.16, 57, 10).rotateX(90).translate(-262.4, 244.52, 150), structuralSteelColor);
add('mixer-wheel-1-hub-1', cylinder(12.16, 57, 10).rotateX(90).translate(-262.4, 332.68, 150), structuralSteelColor);
add('mixer-frame', box(672.4, 325.6, 90, true).translate(0, 0, 225), structuralSteelColor);
add('mixing-drum', cylinder(460, 287, 12).translate(0, 0, 437.1), structuralSteelColor);
add('tilting-cradle', box(508.4, 384.8, 70, true).translate(0, 0, 305), equipmentPaintColor);
add('motor-housing', box(246, 251.6, 250, true).translate(262.4, 0, 345), equipmentPaintColor);
add('push-handle', box(45, 45, 390.6, true).translate(-377.2, 0, 420.3), structuralSteelColor);

return p.model();
