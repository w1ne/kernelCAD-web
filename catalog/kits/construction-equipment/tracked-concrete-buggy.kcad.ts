// SPDX-License-Identifier: CC0-1.0
// Compact powered buggy with tracked undercarriage, skip hopper and operator handles.
meta({
  name: "tracked-concrete-buggy",
  license: 'CC0-1.0',
  title: "Tracked concrete buggy",
  description: "Compact powered buggy with tracked undercarriage, skip hopper and operator handles. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('tracked-concrete-buggy');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('buggy-track--1-belt', box(629, 198.4, 155, true).translate(-34, -186, 77.5), tireRubberColor);
add('buggy-track--1-roller-0', cylinder(182.528, 68.2, 12).rotateX(90).translate(-260.44, -94.736, 71.3), structuralSteelColor);
add('buggy-track--1-roller-0-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-260.44, -291.866, 71.3), structuralSteelColor);
add('buggy-track--1-roller-0-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-260.44, -80.134, 71.3), structuralSteelColor);
add('buggy-track--1-roller-1', cylinder(182.528, 68.2, 12).rotateX(90).translate(-34, -94.736, 71.3), structuralSteelColor);
add('buggy-track--1-roller-1-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-34, -291.866, 71.3), structuralSteelColor);
add('buggy-track--1-roller-1-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-34, -80.134, 71.3), structuralSteelColor);
add('buggy-track--1-roller-2', cylinder(182.528, 68.2, 12).rotateX(90).translate(192.44, -94.736, 71.3), structuralSteelColor);
add('buggy-track--1-roller-2-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(192.44, -291.866, 71.3), structuralSteelColor);
add('buggy-track--1-roller-2-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(192.44, -80.134, 71.3), structuralSteelColor);
add('buggy-track--1-idler-front', cylinder(186.496, 72.85, 12).rotateX(90).translate(223.89, -92.752, 74.4), structuralSteelColor);
add('buggy-track--1-idler-front-hub--1', cylinder(29.839, 27.683, 10).rotateX(90).translate(223.89, -294.168, 74.4), structuralSteelColor);
add('buggy-track--1-idler-front-hub-1', cylinder(29.839, 27.683, 10).rotateX(90).translate(223.89, -77.832, 74.4), structuralSteelColor);
add('buggy-track--1-idler-rear', cylinder(186.496, 72.85, 12).rotateX(90).translate(-291.89, -92.752, 74.4), structuralSteelColor);
add('buggy-track--1-idler-rear-hub--1', cylinder(29.839, 27.683, 10).rotateX(90).translate(-291.89, -294.168, 74.4), structuralSteelColor);
add('buggy-track--1-idler-rear-hub-1', cylinder(29.839, 27.683, 10).rotateX(90).translate(-291.89, -77.832, 74.4), structuralSteelColor);
add('buggy-track-1-belt', box(629, 198.4, 155, true).translate(-34, 186, 77.5), tireRubberColor);
add('buggy-track-1-roller-0', cylinder(182.528, 68.2, 12).rotateX(90).translate(-260.44, 277.264, 71.3), structuralSteelColor);
add('buggy-track-1-roller-0-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-260.44, 80.134, 71.3), structuralSteelColor);
add('buggy-track-1-roller-0-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-260.44, 291.866, 71.3), structuralSteelColor);
add('buggy-track-1-roller-1', cylinder(182.528, 68.2, 12).rotateX(90).translate(-34, 277.264, 71.3), structuralSteelColor);
add('buggy-track-1-roller-1-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-34, 80.134, 71.3), structuralSteelColor);
add('buggy-track-1-roller-1-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(-34, 291.866, 71.3), structuralSteelColor);
add('buggy-track-1-roller-2', cylinder(182.528, 68.2, 12).rotateX(90).translate(192.44, 277.264, 71.3), structuralSteelColor);
add('buggy-track-1-roller-2-hub--1', cylinder(29.204, 25.916, 10).rotateX(90).translate(192.44, 80.134, 71.3), structuralSteelColor);
add('buggy-track-1-roller-2-hub-1', cylinder(29.204, 25.916, 10).rotateX(90).translate(192.44, 291.866, 71.3), structuralSteelColor);
add('buggy-track-1-idler-front', cylinder(186.496, 72.85, 12).rotateX(90).translate(223.89, 279.248, 74.4), structuralSteelColor);
add('buggy-track-1-idler-front-hub--1', cylinder(29.839, 27.683, 10).rotateX(90).translate(223.89, 77.832, 74.4), structuralSteelColor);
add('buggy-track-1-idler-front-hub-1', cylinder(29.839, 27.683, 10).rotateX(90).translate(223.89, 294.168, 74.4), structuralSteelColor);
add('buggy-track-1-idler-rear', cylinder(186.496, 72.85, 12).rotateX(90).translate(-291.89, 279.248, 74.4), structuralSteelColor);
add('buggy-track-1-idler-rear-hub--1', cylinder(29.839, 27.683, 10).rotateX(90).translate(-291.89, 77.832, 74.4), structuralSteelColor);
add('buggy-track-1-idler-rear-hub-1', cylinder(29.839, 27.683, 10).rotateX(90).translate(-291.89, 294.168, 74.4), structuralSteelColor);
add('buggy-frame', box(612, 359.6, 110, true).translate(0, 0, 225), structuralSteelColor);
add('skip-floor', box(442, 372, 70, true).translate(0, 0, 315), equipmentPaintColor);
add('skip-side--1', box(442, 45, 285, true).translate(0, -155, 452.5), equipmentPaintColor);
add('skip-side-1', box(442, 45, 285, true).translate(0, 155, 452.5), equipmentPaintColor);
add('operator-handle', box(55, 60, 340, true).translate(-408, 0, 440), structuralSteelColor);

add('buggy-track-shoe-left-1', box(120, 30, 28, true).translate(-360, -350, 184), tireRubberColor);
add('buggy-track-shoe-left-2', box(120, 30, 28, true).translate(-180, -350, 184), tireRubberColor);
add('buggy-track-shoe-left-3', box(120, 30, 28, true).translate(0, -350, 184), tireRubberColor);
add('buggy-track-shoe-left-4', box(120, 30, 28, true).translate(180, -350, 184), tireRubberColor);
add('buggy-track-shoe-left-5', box(120, 30, 28, true).translate(360, -350, 184), tireRubberColor);
add('buggy-track-shoe-right-1', box(120, 30, 28, true).translate(-360, 350, 184), tireRubberColor);
add('buggy-track-shoe-right-2', box(120, 30, 28, true).translate(-180, 350, 184), tireRubberColor);
add('buggy-track-shoe-right-3', box(120, 30, 28, true).translate(0, 350, 184), tireRubberColor);
add('buggy-track-shoe-right-4', box(120, 30, 28, true).translate(180, 350, 184), tireRubberColor);
add('buggy-track-shoe-right-5', box(120, 30, 28, true).translate(360, 350, 184), tireRubberColor);

return p.model();
