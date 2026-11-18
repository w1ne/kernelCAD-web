// SPDX-License-Identifier: CC0-1.0
// Large site haul truck with high-capacity open bed, tall chassis and oversized tires.
meta({
  name: "rigid-haul-truck",
  license: 'CC0-1.0',
  title: "Rigid-frame haul truck",
  description: "Large site haul truck with high-capacity open bed, tall chassis and oversized tires. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('rigid-haul-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('hauler-chassis', box(1517, 483, 150, true).translate(0, 0, 215), structuralSteelColor);
add('hauler-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-592, -323, 145), tireRubberColor);
add('hauler-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-592, -441.8, 145), structuralSteelColor);
add('hauler-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-592, -314.2, 145), structuralSteelColor);
add('hauler-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-592, 433, 145), tireRubberColor);
add('hauler-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-592, 314.2, 145), structuralSteelColor);
add('hauler-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-592, 441.8, 145), structuralSteelColor);
add('hauler-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(333, -323, 160), tireRubberColor);
add('hauler-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(333, -441.8, 160), structuralSteelColor);
add('hauler-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(333, -314.2, 160), structuralSteelColor);
add('hauler-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(333, 433, 160), tireRubberColor);
add('hauler-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(333, 314.2, 160), structuralSteelColor);
add('hauler-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(333, 441.8, 160), structuralSteelColor);
add('hauler-wheel-2--1', cylinder(110, 160, 12).rotateX(90).translate(629, -323, 160), tireRubberColor);
add('hauler-wheel-2--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(629, -441.8, 160), structuralSteelColor);
add('hauler-wheel-2--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(629, -314.2, 160), structuralSteelColor);
add('hauler-wheel-2-1', cylinder(110, 160, 12).rotateX(90).translate(629, 433, 160), tireRubberColor);
add('hauler-wheel-2-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(629, 314.2, 160), structuralSteelColor);
add('hauler-wheel-2-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(629, 441.8, 160), structuralSteelColor);
add('hauler-cab', box(462.5, 420, 630, true).translate(518, 0, 605), equipmentPaintColor);
add('hauler-cab-window', box(138.75, 14, 157.50, true).translate(494.88, -217.00, 768.80), cabGlassColor);
add('hauler-roof', box(499.5, 451.5, 45, true).translate(518, 0, 942.5), equipmentPaintColor);
add('dump-body-floor', box(888, 672, 630, true).translate(-314.5, 0, 615), equipmentPaintColor);
add('dump-body-side--1', box(925, 84, 840, true).translate(-314.5, -294, 720), equipmentPaintColor);
add('dump-body-side-1', box(925, 84, 840, true).translate(-314.5, 294, 720), equipmentPaintColor);
add('dump-body-front', box(46, 693, 810, true).translate(148, 0, 705), equipmentPaintColor);
add('tailgate', box(42, 703.5, 750, true).translate(-777, 0, 675), equipmentPaintColor);
add('lift-ram', box(90, 75, 675, true).translate(-55.5, 0, 617.5), equipmentPaintColor);

add('front-grille', path().moveTo(-119.70, -126.00).lineTo(119.70, -126.00).lineTo(100.80, 126.00).lineTo(-100.80, 126.00).close().extrude(16).rotateY(90).translate(754.25, 0.00, 479.00), structuralSteelColor);
add('headlamp-near', box(22, 63.00, 59.85, true).translate(759.25, -130.20, 441.20), cabGlassColor);
add('headlamp-far', box(22, 63.00, 59.85, true).translate(759.25, 130.20, 441.20), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(647.50, -260.40, 680.60), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(647.50, 260.40, 680.60), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(679.88, -285.60, 718.40), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(679.88, 285.60, 718.40), cabGlassColor);
add('cab-step', box(129.50, 54, 36, true).translate(582.75, -234.00, 340.40), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(596.62, -220.00, 592.40), structuralSteelColor);
add('cab-windshield', box(16, 260.40, 170.10, true).rotateY(-7).translate(759.25, 0.00, 686.90), cabGlassColor);
add('cab-side-glazing-far', box(138.75, 14, 157.50, true).translate(494.88, 217.00, 768.80), cabGlassColor);

return p.model();