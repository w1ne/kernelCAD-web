// SPDX-License-Identifier: CC0-1.0
// Road grader with articulated chassis, six wheels, operator cab and center moldboard.
meta({
  name: "motor-grader",
  license: 'CC0-1.0',
  title: "Motor grader",
  description: "Road grader with articulated chassis, six wheels, operator cab and center moldboard. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('motor-grader');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('grader-wheel-0--1', cylinder(96, 175, 12).rotateX(90).translate(-595, -209.89, 175), tireRubberColor);
add('grader-wheel-0--1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-595, -313.57, 175), structuralSteelColor);
add('grader-wheel-0--1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-595, -202.21, 175), structuralSteelColor);
add('grader-wheel-0-1', cylinder(96, 175, 12).rotateX(90).translate(-595, 305.89, 175), tireRubberColor);
add('grader-wheel-0-1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-595, 202.21, 175), structuralSteelColor);
add('grader-wheel-0-1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-595, 313.57, 175), structuralSteelColor);
add('grader-wheel-1--1', cylinder(96, 175, 12).rotateX(90).translate(-350, -209.89, 175), tireRubberColor);
add('grader-wheel-1--1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-350, -313.57, 175), structuralSteelColor);
add('grader-wheel-1--1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-350, -202.21, 175), structuralSteelColor);
add('grader-wheel-1-1', cylinder(96, 175, 12).rotateX(90).translate(-350, 305.89, 175), tireRubberColor);
add('grader-wheel-1-1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-350, 202.21, 175), structuralSteelColor);
add('grader-wheel-1-1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(-350, 313.57, 175), structuralSteelColor);
add('grader-wheel-2--1', cylinder(96, 175, 12).rotateX(90).translate(595, -209.89, 175), tireRubberColor);
add('grader-wheel-2--1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(595, -313.57, 175), structuralSteelColor);
add('grader-wheel-2--1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(595, -202.21, 175), structuralSteelColor);
add('grader-wheel-2-1', cylinder(96, 175, 12).rotateX(90).translate(595, 305.89, 175), tireRubberColor);
add('grader-wheel-2-1-hub--1', cylinder(15.36, 66.5, 10).rotateX(90).translate(595, 202.21, 175), structuralSteelColor);
add('grader-wheel-2-1-hub-1', cylinder(15.36, 66.5, 10).rotateX(90).translate(595, 313.57, 175), structuralSteelColor);
add('rear-frame', box(840, 408, 170, true).translate(-280, 0, 365), structuralSteelColor);
add('engine-hood', box(525, 374, 300, true).translate(-490, 0, 600), equipmentPaintColor);
add('operator-cab', box(385, 340, 399, true).translate(210, 0, 659.5), equipmentPaintColor);
add('cab-roof', box(472.5, 382.5, 45, true).translate(210, 0, 881.5), equipmentPaintColor);
add('grader-front-frame', box(752.5, 120, 100, true).translate(700, 0, 280), structuralSteelColor);
add('moldboard', box(420, 765, 75, true).translate(87.5, 0, 217.5), equipmentPaintColor);
add('circle-drive', cylinder(75, 130, 10).translate(0, 0, 165), equipmentPaintColor);

add('front-grille', path().moveTo(-75.81, -102.00).lineTo(75.81, -102.00).lineTo(63.84, 102.00).lineTo(-63.84, 102.00).close().extrude(16).rotateY(90).translate(407.50, 0.00, 579.70), structuralSteelColor);
add('headlamp-near', box(22, 51.00, 37.91, true).translate(412.50, -105.40, 555.76), cabGlassColor);
add('headlamp-far', box(22, 51.00, 37.91, true).translate(412.50, 105.40, 555.76), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(317.80, -210.80, 707.38), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(317.80, 210.80, 707.38), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(344.75, -231.20, 731.32), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(344.75, 231.20, 731.32), cabGlassColor);
add('cab-step', box(107.80, 54, 36, true).translate(263.90, -194.00, 491.92), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(275.45, -180.00, 651.52), structuralSteelColor);
add('cab-windshield', box(16, 210.80, 107.73, true).rotateY(-7).translate(412.50, 0.00, 711.37), cabGlassColor);
add('cab-side-glazing-far', box(115.50, 14, 99.75, true).translate(190.75, 177.00, 763.24), cabGlassColor);

return p.model();