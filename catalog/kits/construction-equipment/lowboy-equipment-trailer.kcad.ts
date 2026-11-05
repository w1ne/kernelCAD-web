// SPDX-License-Identifier: CC0-1.0
// Heavy equipment trailer with a dropped deck, twin axle groups and loading ramps.
meta({
  name: "lowboy-equipment-trailer",
  license: 'CC0-1.0',
  title: "Lowboy equipment trailer",
  description: "Heavy equipment trailer with a dropped deck, twin axle groups and loading ramps. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('lowboy-equipment-trailer');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('trailer-deck', box(1295, 639.6, 100, true).translate(-148, 0, 150), structuralSteelColor);
add('trailer-wheel-0--1', cylinder(86, 150, 12).rotateX(90).translate(-481, -301.4, 150), tireRubberColor);
add('trailer-wheel-0--1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-481, -394.28, 150), structuralSteelColor);
add('trailer-wheel-0--1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-481, -294.52, 150), structuralSteelColor);
add('trailer-wheel-0-1', cylinder(86, 150, 12).rotateX(90).translate(-481, 387.4, 150), tireRubberColor);
add('trailer-wheel-0-1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-481, 294.52, 150), structuralSteelColor);
add('trailer-wheel-0-1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-481, 394.28, 150), structuralSteelColor);
add('trailer-wheel-1--1', cylinder(86, 150, 12).rotateX(90).translate(-92.5, -301.4, 150), tireRubberColor);
add('trailer-wheel-1--1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-92.5, -394.28, 150), structuralSteelColor);
add('trailer-wheel-1--1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-92.5, -294.52, 150), structuralSteelColor);
add('trailer-wheel-1-1', cylinder(86, 150, 12).rotateX(90).translate(-92.5, 387.4, 150), tireRubberColor);
add('trailer-wheel-1-1-hub--1', cylinder(13.76, 57, 10).rotateX(90).translate(-92.5, 294.52, 150), structuralSteelColor);
add('trailer-wheel-1-1-hub-1', cylinder(13.76, 57, 10).rotateX(90).translate(-92.5, 394.28, 150), structuralSteelColor);
add('drawbar', box(518, 90, 75, true).translate(703, 0, 167.5), equipmentPaintColor);
add('drawbar-arm-left', box(720, 52, 52, true).rotateZ(-19).translate(580, -112, 166), structuralSteelColor);
add('drawbar-arm-right', box(720, 52, 52, true).rotateZ(19).translate(580, 112, 166), structuralSteelColor);
add('lowboy-raised-neck', box(320, 480, 100, true).translate(415, 0, 250), structuralSteelColor);
add('lowboy-neck-transition', box(230, 480, 70, true).rotateY(-22).translate(150, 0, 210), structuralSteelColor);
add('trailer-tandem-wheel-near', cylinder(86, 150, 12).rotateX(90).translate(-286, -301.4, 150), tireRubberColor);
add('trailer-tandem-wheel-far', cylinder(86, 150, 12).rotateX(90).translate(-286, 387.4, 150), tireRubberColor);
add('trailer-tandem-hub-near', cylinder(13.76, 57, 10).rotateX(90).translate(-286, -394.28, 150), structuralSteelColor);
add('trailer-tandem-hub-far', cylinder(13.76, 57, 10).rotateX(90).translate(-286, 394.28, 150), structuralSteelColor);
add('loading-ramp--1', box(460, 55, 54, true).rotateY(-38).translate(-777, -254.2, 175), equipmentPaintColor);
add('loading-ramp-1', box(460, 55, 54, true).rotateY(-38).translate(-777, 254.2, 175), equipmentPaintColor);

return p.model();
