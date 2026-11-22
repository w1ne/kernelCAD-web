// SPDX-License-Identifier: CC0-1.0
// Static drywall panel lift with a nested mast, connected support cradle and three radial caster legs. CC0 visualization geometry, not manufacturer CAD or a load-rated or kinematically verified lift.
meta({
  name: "drywall-panel-lift",
  license: 'CC0-1.0',
  title: "Drywall panel lift",
  description: "Static drywall panel lift with a nested mast, connected support cradle and three radial caster legs. CC0 visualization geometry, not manufacturer CAD or a load-rated or kinematically verified lift. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
// Every radial leg reaches the central hub and one grounded caster assembly.
add('base-hub', box(160, 160, 80, true).translate(0, 0, 180), structuralSteelColor);
for (let i = 0; i < 3; i++) {
  const angle = i * 120;
  const radians = angle * Math.PI / 180;
  const x = 460 * Math.cos(radians);
  const y = 460 * Math.sin(radians);
  add(`base-leg-${i}`, box(460, 60, 60, true).translate(230, 0, 195).rotateZ(angle));
  add(`caster-${i}`, cylinder(50, 75, 12).rotateX(90).translate(x, y + 25, 75), tireRubberColor);
  add(`caster-bridge-${i}`, box(40, 108, 20, true).translate(x, y, 230), structuralSteelColor);
  add(`caster-axle-${i}`, cylinder(108, 9, 10).rotateX(90).translate(x, y + 54, 75), structuralSteelColor);
  for (const side of [-1, 1]) {
    add(`caster-fork-${i}-${side}`, box(40, 14, 155, true).translate(x, y + side * 40, 152.5), structuralSteelColor);
  }
}
// Nested tubes overlap axially; the inner tube seats against the cradle underside.
const outerMast = cylinder(1023, 52, 12).subtract(cylinder(1025, 40, 12).translate(0, 0, -1));
add('mast', outerMast.translate(0, 0, 160), structuralSteelColor);
add('mast-extension', cylinder(320, 35, 12).translate(0, 0, 1000), structuralSteelColor);
add('mast-collar', box(135, 135, 58, true).translate(0, 0, 1154), structuralSteelColor);
add('tilt-cradle', box(100, 140, 60, true).translate(0, 0, 1350));
add('cradle-crossbar', box(55, 736, 48, true).translate(0, 0, 1356), structuralSteelColor);
for (const side of [-1, 1]) {
  add(`cradle-arm-${side}`, box(656, 40, 60, true).translate(0, side * 167, 1350));
}

return p.model();
