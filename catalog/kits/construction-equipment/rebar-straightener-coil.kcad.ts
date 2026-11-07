// SPDX-License-Identifier: CC0-1.0
// Portable rebar straightening unit with feed rollers, guide wheels and coil stand.
meta({
  name: "rebar-straightener-coil",
  license: 'CC0-1.0',
  title: "Rebar straightener and coil stand",
  description: "Portable rebar straightening unit with feed rollers, guide wheels and coil stand. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('rebar-straightener-coil');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(840, 456, 110, true).translate(0, 0, 55), equipmentPaintColor);
add('work-table', box(1050, 468, 80, true).translate(0, 0, 150), equipmentPaintColor);
add('motor-case', box(262.5, 288, 258.4, true).translate(-231, 0, 319.2), equipmentPaintColor);
add('feed-roller-0', cylinder(336, 48, 8).rotateX(90).translate(-189, 168, 418), structuralSteelColor);
add('feed-roller-1', cylinder(336, 48, 8).rotateX(90).translate(-63, 168, 418), structuralSteelColor);
add('feed-roller-2', cylinder(336, 48, 8).rotateX(90).translate(63, 168, 418), structuralSteelColor);
add('feed-roller-3', cylinder(336, 48, 8).rotateX(90).translate(189, 168, 418), structuralSteelColor);
add('coil-hub', cylinder(312, 140, 10).rotateX(90).translate(-441, 156, 380), structuralSteelColor);
add('coil-support', box(45, 372, 380, true).translate(-441, 0, 190), structuralSteelColor);

return p.model();
