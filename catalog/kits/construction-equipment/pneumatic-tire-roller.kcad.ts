// SPDX-License-Identifier: CC0-1.0
// Road compactor with staggered banks of rubber tires and a raised operator station.
meta({
  name: "pneumatic-tire-roller",
  license: 'CC0-1.0',
  title: "Pneumatic tire roller",
  description: "Road compactor with staggered banks of rubber tires and a raised operator station. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('pneumatic-tire-roller');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(918, 425, 180, true).translate(81, 0, 320), structuralSteelColor);
add('pneumatic-tire-0--1', cylinder(90, 165, 12).rotateX(90).translate(-472.5, -252.5, 165), tireRubberColor);
add('pneumatic-tire-0--1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-472.5, -349.7, 165), structuralSteelColor);
add('pneumatic-tire-0--1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-472.5, -245.3, 165), structuralSteelColor);
add('pneumatic-tire-0-1', cylinder(90, 165, 12).rotateX(90).translate(-472.5, 342.5, 165), tireRubberColor);
add('pneumatic-tire-0-1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-472.5, 245.3, 165), structuralSteelColor);
add('pneumatic-tire-0-1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-472.5, 349.7, 165), structuralSteelColor);
add('pneumatic-tire-1--1', cylinder(90, 165, 12).rotateX(90).translate(-162, -252.5, 165), tireRubberColor);
add('pneumatic-tire-1--1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-162, -349.7, 165), structuralSteelColor);
add('pneumatic-tire-1--1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-162, -245.3, 165), structuralSteelColor);
add('pneumatic-tire-1-1', cylinder(90, 165, 12).rotateX(90).translate(-162, 342.5, 165), tireRubberColor);
add('pneumatic-tire-1-1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-162, 245.3, 165), structuralSteelColor);
add('pneumatic-tire-1-1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(-162, 349.7, 165), structuralSteelColor);
add('pneumatic-tire-2--1', cylinder(90, 165, 12).rotateX(90).translate(162, -252.5, 165), tireRubberColor);
add('pneumatic-tire-2--1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(162, -349.7, 165), structuralSteelColor);
add('pneumatic-tire-2--1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(162, -245.3, 165), structuralSteelColor);
add('pneumatic-tire-2-1', cylinder(90, 165, 12).rotateX(90).translate(162, 342.5, 165), tireRubberColor);
add('pneumatic-tire-2-1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(162, 245.3, 165), structuralSteelColor);
add('pneumatic-tire-2-1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(162, 349.7, 165), structuralSteelColor);
add('pneumatic-tire-3--1', cylinder(90, 165, 12).rotateX(90).translate(472.5, -252.5, 165), tireRubberColor);
add('pneumatic-tire-3--1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(472.5, -349.7, 165), structuralSteelColor);
add('pneumatic-tire-3--1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(472.5, -245.3, 165), structuralSteelColor);
add('pneumatic-tire-3-1', cylinder(90, 165, 12).rotateX(90).translate(472.5, 342.5, 165), tireRubberColor);
add('pneumatic-tire-3-1-hub--1', cylinder(14.4, 62.7, 10).rotateX(90).translate(472.5, 245.3, 165), structuralSteelColor);
add('pneumatic-tire-3-1-hub-1', cylinder(14.4, 62.7, 10).rotateX(90).translate(472.5, 349.7, 165), structuralSteelColor);
add('engine-cover', box(378, 382.5, 250, true).translate(216, 0, 535), equipmentPaintColor);
add('operator-platform', box(337.5, 323, 50, true).translate(-189, 0, 445), equipmentPaintColor);
add('canopy-posts', box(28, 272, 252, true).translate(-229.5, 0, 596), equipmentPaintColor);
add('canopy-roof', box(472.5, 374, 42, true).translate(-229.5, 0, 743), equipmentPaintColor);

return p.model();
