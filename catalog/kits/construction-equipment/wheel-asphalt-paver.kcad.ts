// SPDX-License-Identifier: CC0-1.0
// Rubber-wheel paving machine with front hopper, raised operator station and adjustable rear screed.
meta({
  name: "wheel-asphalt-paver",
  license: 'CC0-1.0',
  title: "Wheeled asphalt paver",
  description: "Rubber-wheel paving machine with front hopper, raised operator station and adjustable rear screed. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('wheel-asphalt-paver');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('paver-wheel-0--1', cylinder(85, 145, 12).rotateX(90).translate(-406, -230.56, 145), tireRubberColor);
add('paver-wheel-0--1-hub--1', cylinder(13.6, 55.1, 10).rotateX(90).translate(-406, -322.36, 145), structuralSteelColor);
add('paver-wheel-0--1-hub-1', cylinder(13.6, 55.1, 10).rotateX(90).translate(-406, -223.76, 145), structuralSteelColor);
add('paver-wheel-0-1', cylinder(85, 145, 12).rotateX(90).translate(-406, 315.56, 145), tireRubberColor);
add('paver-wheel-0-1-hub--1', cylinder(13.6, 55.1, 10).rotateX(90).translate(-406, 223.76, 145), structuralSteelColor);
add('paver-wheel-0-1-hub-1', cylinder(13.6, 55.1, 10).rotateX(90).translate(-406, 322.36, 145), structuralSteelColor);
add('paver-wheel-1--1', cylinder(85, 145, 12).rotateX(90).translate(391.5, -230.56, 145), tireRubberColor);
add('paver-wheel-1--1-hub--1', cylinder(13.6, 55.1, 10).rotateX(90).translate(391.5, -322.36, 145), structuralSteelColor);
add('paver-wheel-1--1-hub-1', cylinder(13.6, 55.1, 10).rotateX(90).translate(391.5, -223.76, 145), structuralSteelColor);
add('paver-wheel-1-1', cylinder(85, 145, 12).rotateX(90).translate(391.5, 315.56, 145), tireRubberColor);
add('paver-wheel-1-1-hub--1', cylinder(13.6, 55.1, 10).rotateX(90).translate(391.5, 223.76, 145), structuralSteelColor);
add('paver-wheel-1-1-hub-1', cylinder(13.6, 55.1, 10).rotateX(90).translate(391.5, 322.36, 145), structuralSteelColor);
add('main-deck', box(1044, 522, 230, true).translate(0, 0, 335), equipmentPaintColor);
add('material-hopper', box(348, 648, 360, true).rotateY(-8).translate(493, 0, 480), equipmentPaintColor);
add('hopper-wing-left', box(290, 72, 340, true).translate(493, -306, 480), equipmentPaintColor);
add('hopper-wing-right', box(290, 72, 340, true).translate(493, 306, 480), equipmentPaintColor);
add('operator-platform', box(362.5, 378, 50, true).translate(-188.5, 0, 475), equipmentPaintColor);
add('canopy-posts', box(32, 315, 294.4, true).translate(-174, 0, 647.2), equipmentPaintColor);
add('canopy-roof', box(609, 495, 50, true).translate(-174, 0, 819.4), equipmentPaintColor);
add('feeder-deck', box(493, 378, 85, true).translate(-536.5, 0, 192.5), equipmentPaintColor);
add('screed-main', box(68, 828, 120, true).translate(-696, 0, 125), structuralSteelColor);
add('screed-wing--1', box(70, 162, 95, true).translate(-696, -468, 127.5), structuralSteelColor);
add('screed-arm--1', box(391.5, 35, 38, true).translate(-464, -306, 199), structuralSteelColor);
add('screed-wing-1', box(70, 162, 95, true).translate(-696, 468, 127.5), structuralSteelColor);
add('screed-arm-1', box(391.5, 35, 38, true).translate(-464, 306, 199), structuralSteelColor);
add('feed-auger', cylinder(558, 48, 10).translate(-391.5, 0, 180), equipmentPaintColor);

return p.model();
