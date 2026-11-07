// SPDX-License-Identifier: CC0-1.0
// Foldable panel lift with telescoping mast, tilting cradle, tripod legs and casters.
meta({
  name: "drywall-panel-lift",
  license: 'CC0-1.0',
  title: "Drywall panel lift",
  description: "Foldable panel lift with telescoping mast, tilting cradle, tripod legs and casters. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('drywall-panel-lift');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('base-crossbar', box(800, 70, 52, true).translate(0, 0, 136), structuralSteelColor);
add('caster--1', cylinder(52, 78, 12).rotateX(90).translate(-304, 26, 78), tireRubberColor);
add('caster--1-hub--1', cylinder(8.32, 29.64, 10).rotateX(90).translate(-304, -30.16, 78), structuralSteelColor);
add('caster--1-hub-1', cylinder(8.32, 29.64, 10).rotateX(90).translate(-304, 30.16, 78), structuralSteelColor);
add('caster-1', cylinder(52, 78, 12).rotateX(90).translate(304, 26, 78), tireRubberColor);
add('caster-1-hub--1', cylinder(8.32, 29.64, 10).rotateX(90).translate(304, -30.16, 78), structuralSteelColor);
add('caster-1-hub-1', cylinder(8.32, 29.64, 10).rotateX(90).translate(304, 30.16, 78), structuralSteelColor);
add('mast', cylinder(1023, 52, 8).translate(0, 0, 160), structuralSteelColor);
add('mast-collar', box(135, 135, 58, true).translate(0, 0, 821), structuralSteelColor);
add('tilt-cradle', box(656, 374.4, 60, true).translate(0, 0, 1350), equipmentPaintColor);
add('cradle-crossbar', box(55, 736, 48, true).translate(0, 0, 1509), structuralSteelColor);
add('base-leg-left', box(60, 648, 65, true).translate(-288, 0, 32.5), equipmentPaintColor);
add('base-leg-right', box(60, 648, 65, true).translate(288, 0, 32.5), equipmentPaintColor);

return p.model();
