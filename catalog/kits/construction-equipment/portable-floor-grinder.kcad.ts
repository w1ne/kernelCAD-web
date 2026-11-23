// SPDX-License-Identifier: CC0-1.0
// Illustrative walk-behind single-disc grinder, not a manufacturing drawing.
meta({
  name: "portable-floor-grinder",
  license: 'CC0-1.0',
  title: "Portable floor grinder",
  description: "Illustrative CC0 low-poly walk-behind floor grinder with a circular open-bottom dust shroud, separate floor-contact disc, two rear wheels and inclined handlebar. Not a manufacturing drawing or performance/safety model. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('portable-floor-grinder');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
// Source coordinates are millimetres, Z up. The 338 mm disc touches the
// ground; its circular shroud is open below and does not become a solid cart.
const deckX = 90;
add('grinding-head', cylinder(12, 169, 32).translate(deckX, 0, 0), structuralSteelColor);
const shroud = cylinder(70, 190, 32)
  .subtract(cylinder(68, 178, 32).translate(0, 0, -2));
add('dust-shroud', shroud.translate(deckX, 0, 14));
const skirt = cylinder(14, 188, 32)
  .subtract(cylinder(16, 176, 32).translate(0, 0, -1));
add('dust-skirt', skirt.translate(deckX, 0, 3), tireRubberColor);

// One rear axle, not four cart wheels. The nearest tire remains 38 mm
// behind the circular shroud at default scale; both tires touch the floor.
add('rear-axle', cylinder(448, 14, 12).rotateX(90).translate(-230, 224, 92), structuralSteelColor);
for (const side of [-1, 1]) {
  const startY = side < 0 ? -170 : 224;
  add(`rear-wheel-${side}`, cylinder(54, 92, 24).rotateX(90).translate(-230, startY, 92), tireRubberColor);
  add(`wheel-hub-${side}`, cylinder(8, 35, 12).rotateX(90).translate(-230, side < 0 ? -220 : 228, 92), structuralSteelColor);
  add(`frame-rail-${side}`, box(320, 24, 32, true).translate(-70, side * 125, 130), structuralSteelColor);
  add(`axle-support-${side}`, box(32, 24, 38, true).translate(-230, side * 125, 111), structuralSteelColor);
}
add('motor-mount', box(210, 274, 12, true).translate(deckX, 0, 108), structuralSteelColor);
add('gearbox', cylinder(70, 85, 24).translate(deckX, 0, 84));
add('motor-housing', cylinder(232, 70, 24).translate(deckX, 0, 154));
add('motor-cover', cylinder(18, 78, 24).translate(deckX, 0, 386));
// Hollow side-facing hose stub identifies the dust-extraction interface.
add('dust-outlet', cylinder(65, 24, 16).subtract(cylinder(67, 18, 16).translate(0, 0, -1))
  .rotateX(90).translate(deckX, -175, 55), structuralSteelColor);

// Two inclined posts join the rear rails to a transverse walking-height grip.
const rise = 750, reach = 290;
const postLength = Math.sqrt(rise * rise + reach * reach);
const postAngle = -Math.atan2(reach, rise) * 180 / Math.PI;
for (const side of [-1, 1]) {
  add(`handle-post-${side}`, cylinder(postLength, 12, 12).rotateY(postAngle)
    .translate(-210, side * 125, 146), structuralSteelColor);
}
add('handle-bar', cylinder(440, 14, 12).rotateX(90).translate(-500, 220, 896), structuralSteelColor);
for (const side of [-1, 1]) {
  add(`handle-grip-${side}`, cylinder(95, 19, 12).rotateX(90)
    .translate(-500, side < 0 ? -125 : 220, 896), tireRubberColor);
}

return p.model();
