// SPDX-License-Identifier: CC0-1.0
// Site forklift with wide tires, overhead guard, tall mast and long fork tines.
meta({
  name: "rough-terrain-forklift",
  license: 'CC0-1.0',
  title: "Rough-terrain forklift",
  description: "Site forklift with wide tires, overhead guard, tall mast and long fork tines. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('rough-terrain-forklift');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('forklift-wheel-0--1', cylinder(95, 170, 12).rotateX(90).translate(-324.8, -177.46, 170), tireRubberColor);
add('forklift-wheel-0--1-hub--1', cylinder(15.2, 64.6, 10).rotateX(90).translate(-324.8, -280.06, 170), structuralSteelColor);
add('forklift-wheel-0--1-hub-1', cylinder(15.2, 64.6, 10).rotateX(90).translate(-324.8, -169.86, 170), structuralSteelColor);
add('forklift-wheel-0-1', cylinder(95, 170, 12).rotateX(90).translate(-324.8, 272.46, 170), tireRubberColor);
add('forklift-wheel-0-1-hub--1', cylinder(15.2, 64.6, 10).rotateX(90).translate(-324.8, 169.86, 170), structuralSteelColor);
add('forklift-wheel-0-1-hub-1', cylinder(15.2, 64.6, 10).rotateX(90).translate(-324.8, 280.06, 170), structuralSteelColor);
add('forklift-wheel-1--1', cylinder(95, 170, 12).rotateX(90).translate(302.4, -177.46, 170), tireRubberColor);
add('forklift-wheel-1--1-hub--1', cylinder(15.2, 64.6, 10).rotateX(90).translate(302.4, -280.06, 170), structuralSteelColor);
add('forklift-wheel-1--1-hub-1', cylinder(15.2, 64.6, 10).rotateX(90).translate(302.4, -169.86, 170), structuralSteelColor);
add('forklift-wheel-1-1', cylinder(95, 170, 12).rotateX(90).translate(302.4, 272.46, 170), tireRubberColor);
add('forklift-wheel-1-1-hub--1', cylinder(15.2, 64.6, 10).rotateX(90).translate(302.4, 169.86, 170), structuralSteelColor);
add('forklift-wheel-1-1-hub-1', cylinder(15.2, 64.6, 10).rotateX(90).translate(302.4, 280.06, 170), structuralSteelColor);
add('forklift-frame', box(728, 418, 190, true).translate(0, 0, 325), structuralSteelColor);
add('operator-cab', box(302.4, 319.2, 368, true).translate(-112, 0, 604), equipmentPaintColor);
add('overhead-guard', box(403.2, 380, 36, true).translate(-112, 0, 806), structuralSteelColor);
add('mast-inner', box(75, 357.2, 713, true).translate(425.6, 0, 506.5), structuralSteelColor);
add('mast-outer-left', box(58, 38, 828, true).translate(425.6, -167.2, 544), structuralSteelColor);
add('mast-outer-right', box(58, 38, 828, true).translate(425.6, 167.2, 544), structuralSteelColor);
add('fork-carriage', box(70, 471.2, 150, true).translate(481.6, 0, 305), structuralSteelColor);
add('fork-tine--1', box(340, 40, 46, true).translate(649.6, -152, 103), structuralSteelColor);
add('fork-tine-1', box(340, 40, 46, true).translate(649.6, 152, 103), structuralSteelColor);

add('front-grille', path().moveTo(-69.92, -95.76).lineTo(69.92, -95.76).lineTo(58.88, 95.76).lineTo(-58.88, 95.76).close().extrude(16).rotateY(90).translate(44.20, 0.00, 530.40), structuralSteelColor);
add('headlamp-near', box(22, 47.88, 34.96, true).translate(49.20, -98.95, 508.32), cabGlassColor);
add('headlamp-far', box(22, 47.88, 34.96, true).translate(49.20, 98.95, 508.32), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(-27.33, -197.90, 648.16), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(-27.33, 197.90, 648.16), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(-6.16, -217.06, 670.24), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(-6.16, 217.06, 670.24), cabGlassColor);
add('cab-step', box(84.67, 54, 36, true).translate(-69.66, -183.60, 449.44), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(-60.59, -169.60, 596.64), structuralSteelColor);
add('cab-windshield', box(16, 197.90, 99.36, true).rotateY(-7).translate(49.20, 0.00, 651.84), cabGlassColor);
add('cab-side-glazing-far', box(90.72, 14, 92.00, true).translate(-127.12, 166.60, 699.68), cabGlassColor);

return p.model();