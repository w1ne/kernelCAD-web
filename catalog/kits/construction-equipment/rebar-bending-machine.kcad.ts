// SPDX-License-Identifier: CC0-1.0
// Portable rebar bender with flat work table, rotary pin plate and control pedal.
meta({
  name: "rebar-bending-machine",
  license: 'CC0-1.0',
  title: "Rebar bending machine",
  description: "Portable rebar bender with flat work table, rotary pin plate and control pedal. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('rebar-bending-machine');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(608, 425.6, 110, true).translate(0, 0, 55), equipmentPaintColor);
add('work-table', box(760, 436.8, 80, true).translate(0, 0, 150), equipmentPaintColor);
add('motor-case', box(190, 268.8, 176.8, true).translate(-167.2, 0, 278.4), equipmentPaintColor);
add('bending-disc', cylinder(72, 134.4, 10).translate(182.4, 0, 190), structuralSteelColor);
add('bend-pin-0', cylinder(48, 18, 8).translate(76, 0, 260), structuralSteelColor);
add('bend-pin-1', cylinder(48, 18, 8).translate(129.2, 0, 260), structuralSteelColor);
add('bend-pin-2', cylinder(48, 18, 8).translate(182.4, 0, 260), structuralSteelColor);
add('bend-pin-3', cylinder(48, 18, 8).translate(235.6, 0, 260), structuralSteelColor);
add('bend-pin-4', cylinder(48, 18, 8).translate(288.8, 0, 260), structuralSteelColor);

return p.model();
