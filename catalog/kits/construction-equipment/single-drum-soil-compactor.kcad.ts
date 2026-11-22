// SPDX-License-Identifier: CC0-1.0
// Soil compactor with broad front drum, rear traction tires and enclosed operator cab.
meta({
  name: "single-drum-soil-compactor",
  license: 'CC0-1.0',
  title: "Single-drum soil compactor",
  description: "Soil compactor with broad front drum, rear traction tires and enclosed operator cab. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('single-drum-soil-compactor');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(850, 380, 180, true).translate(75, 0, 320), structuralSteelColor);
add('front-drum', cylinder(592.8, 240, 12).rotateX(90).translate(425, 296.4, 240), structuralSteelColor);
add('front-drum-hub--1', cylinder(94.848, 91.2, 10).rotateX(90).translate(425, -343.824, 240), structuralSteelColor);
add('front-drum-hub-1', cylinder(94.848, 91.2, 10).rotateX(90).translate(425, 343.824, 240), structuralSteelColor);
add('rear-tire--1', cylinder(100, 155, 12).rotateX(90).translate(-400, -86.8, 155), tireRubberColor);
add('rear-tire--1-hub--1', cylinder(16, 58.9, 10).rotateX(90).translate(-400, -194.8, 155), structuralSteelColor);
add('rear-tire--1-hub-1', cylinder(16, 58.9, 10).rotateX(90).translate(-400, -78.8, 155), structuralSteelColor);
add('rear-tire-1', cylinder(100, 155, 12).rotateX(90).translate(-400, 186.8, 155), tireRubberColor);
add('rear-tire-1-hub--1', cylinder(16, 58.9, 10).rotateX(90).translate(-400, 78.8, 155), structuralSteelColor);
add('rear-tire-1-hub-1', cylinder(16, 58.9, 10).rotateX(90).translate(-400, 194.8, 155), structuralSteelColor);
add('engine-cover', box(350, 342, 250, true).translate(200, 0, 535), equipmentPaintColor);
add('operator-platform', box(312.5, 288.8, 50, true).translate(-175, 0, 445), equipmentPaintColor);
add('canopy-posts', box(28, 243.2, 308, true).translate(-212.5, 0, 624), equipmentPaintColor);
add('canopy-roof', box(437.5, 334.4, 42, true).translate(-212.5, 0, 799), equipmentPaintColor);

return p.model();
