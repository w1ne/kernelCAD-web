// SPDX-License-Identifier: CC0-1.0
// Towable concrete pump with hopper, motor enclosure, hose connections and road wheels.
meta({
  name: "trailer-concrete-line-pump",
  license: 'CC0-1.0',
  title: "Trailer concrete line pump",
  description: "Towable concrete pump with hopper, motor enclosure, hose connections and road wheels. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('trailer-concrete-line-pump');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('trailer-deck', box(735, 546, 100, true).translate(-84, 0, 150), structuralSteelColor);
add('trailer-wheel-0--1', cylinder(86, 150, 12).rotateX(90).translate(-273, -251, 150), tireRubberColor);
add('trailer-wheel-0--1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-273, -343.88, 150), structuralSteelColor);
add('trailer-wheel-0--1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-273, -244.12, 150), structuralSteelColor);
add('trailer-wheel-0-1', cylinder(86, 150, 12).rotateX(90).translate(-273, 337, 150), tireRubberColor);
add('trailer-wheel-0-1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-273, 244.12, 150), structuralSteelColor);
add('trailer-wheel-0-1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-273, 343.88, 150), structuralSteelColor);
add('trailer-wheel-1--1', cylinder(86, 150, 12).rotateX(90).translate(-52.5, -251, 150), tireRubberColor);
add('trailer-wheel-1--1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-52.5, -343.88, 150), structuralSteelColor);
add('trailer-wheel-1--1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-52.5, -244.12, 150), structuralSteelColor);
add('trailer-wheel-1-1', cylinder(86, 150, 12).rotateX(90).translate(-52.5, 337, 150), tireRubberColor);
add('trailer-wheel-1-1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-52.5, 244.12, 150), structuralSteelColor);
add('trailer-wheel-1-1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-52.5, 343.88, 150), structuralSteelColor);
add('drawbar', box(294, 90, 75, true).translate(399, 0, 167.5), equipmentPaintColor);
add('loading-ramp--1', box(210, 55, 290, true).translate(-441, -217, 145), equipmentPaintColor);
add('loading-ramp-1', box(210, 55, 290, true).translate(-441, 217, 145), equipmentPaintColor);
add('pump-enclosure', box(420, 406, 414, true).translate(0, 0, 517), equipmentPaintColor);
add('hopper', box(231, 420, 210, true).translate(126, 0, 685), equipmentPaintColor);
add('hose-connection', cylinder(364, 42, 8).translate(262.5, 0, 420), tireRubberColor);
add('control-panel', box(170, 35, 150, true).translate(-168, -210, 475), equipmentPaintColor);

return p.model();
