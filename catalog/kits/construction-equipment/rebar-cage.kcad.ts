// SPDX-License-Identifier: CC0-1.0
// Short reinforcing cage assembled from longitudinal bars and repeating ties.
meta({
  name: "rebar-cage",
  license: 'CC0-1.0',
  title: "Reinforcing bar cage",
  description: "Short reinforcing cage assembled from longitudinal bars and repeating ties. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('rebar-cage');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('assembly-skid', box(1260, 558, 35, true).translate(0, 0, 17.5), equipmentPaintColor);
add('support-saddle--1', box(1176, 35, 111.6, true).translate(0, -235.6, 90.8), structuralSteelColor);
add('support-saddle-1', box(1176, 35, 111.6, true).translate(0, 235.6, 90.8), structuralSteelColor);
add('longitudinal-bar--1-0', cylinder(1148, 18, 6).rotateY(90).translate(-574, -260.4, 372), equipmentPaintColor);
add('longitudinal-bar--1-1', cylinder(1148, 18, 6).rotateY(90).translate(-574, -156.24, 372), equipmentPaintColor);
add('longitudinal-bar--1-2', cylinder(1148, 18, 6).rotateY(90).translate(-574, -52.08, 372), equipmentPaintColor);
add('longitudinal-bar--1-3', cylinder(1148, 18, 6).rotateY(90).translate(-574, 52.08, 372), equipmentPaintColor);
add('longitudinal-bar--1-4', cylinder(1148, 18, 6).rotateY(90).translate(-574, 156.24, 372), equipmentPaintColor);
add('longitudinal-bar--1-5', cylinder(1148, 18, 6).rotateY(90).translate(-574, 260.4, 372), equipmentPaintColor);
add('longitudinal-bar-1-0', cylinder(1148, 18, 6).rotateY(90).translate(-574, -260.4, 372), equipmentPaintColor);
add('longitudinal-bar-1-1', cylinder(1148, 18, 6).rotateY(90).translate(-574, -156.24, 372), equipmentPaintColor);
add('longitudinal-bar-1-2', cylinder(1148, 18, 6).rotateY(90).translate(-574, -52.08, 372), equipmentPaintColor);
add('longitudinal-bar-1-3', cylinder(1148, 18, 6).rotateY(90).translate(-574, 52.08, 372), equipmentPaintColor);
add('longitudinal-bar-1-4', cylinder(1148, 18, 6).rotateY(90).translate(-574, 156.24, 372), equipmentPaintColor);
add('longitudinal-bar-1-5', cylinder(1148, 18, 6).rotateY(90).translate(-574, 260.4, 372), equipmentPaintColor);
add('tie-ring-0', cylinder(446.4, 16, 8).rotateX(90).translate(-532, 223.2, 372), structuralSteelColor);
add('tie-ring-1', cylinder(446.4, 16, 8).rotateX(90).translate(-380, 223.2, 372), structuralSteelColor);
add('tie-ring-2', cylinder(446.4, 16, 8).rotateX(90).translate(-228, 223.2, 372), structuralSteelColor);
add('tie-ring-3', cylinder(446.4, 16, 8).rotateX(90).translate(-76, 223.2, 372), structuralSteelColor);
add('tie-ring-4', cylinder(446.4, 16, 8).rotateX(90).translate(76, 223.2, 372), structuralSteelColor);
add('tie-ring-5', cylinder(446.4, 16, 8).rotateX(90).translate(228, 223.2, 372), structuralSteelColor);
add('tie-ring-6', cylinder(446.4, 16, 8).rotateX(90).translate(380, 223.2, 372), structuralSteelColor);
add('tie-ring-7', cylinder(446.4, 16, 8).rotateX(90).translate(532, 223.2, 372), structuralSteelColor);

return p.model();
