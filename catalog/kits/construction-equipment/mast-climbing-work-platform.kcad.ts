// SPDX-License-Identifier: CC0-1.0
// Twin-mast access platform with guardrails, deck and ground outriggers.
meta({
  name: "mast-climbing-work-platform",
  license: 'CC0-1.0',
  title: "Mast-climbing work platform",
  description: "Twin-mast access platform with guardrails, deck and ground outriggers. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
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
const p = assembly('mast-climbing-work-platform');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(1353, 475.6, 90, true).translate(0, 0, 45), structuralSteelColor);
add('mast--1', box(70, 72, 1665, true).translate(-610.5, 0, 922.5), structuralSteelColor);
add('outrigger--1', box(858, 48, 55, true).translate(-660, 0, 27.5), structuralSteelColor);
add('mast-1', box(70, 72, 1665, true).translate(610.5, 0, 922.5), structuralSteelColor);
add('outrigger-1', box(858, 48, 55, true).translate(660, 0, 27.5), structuralSteelColor);
add('working-platform', box(1848, 510.4, 70, true).translate(0, 0, 1052.5), equipmentPaintColor);
add('guardrail--1', box(1815, 34, 462.5, true).translate(0, -243.6, 1341.25), structuralSteelColor);
add('guardrail-1', box(1815, 34, 462.5, true).translate(0, 243.6, 1341.25), structuralSteelColor);

return p.model();
