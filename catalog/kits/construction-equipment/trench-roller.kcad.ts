// SPDX-License-Identifier: CC0-1.0
// Compact trench compactor with paired steel drums and a protected remote-control mast.
meta({
  name: "trench-roller",
  license: 'CC0-1.0',
  title: "Remote trench roller",
  description: "Compact trench compactor with paired steel drums and a protected remote-control mast. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('trench-roller');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(462.4, 260, 180, true).translate(40.8, 0, 320), structuralSteelColor);
add('front-drum', cylinder(395.2, 110, 12).rotateX(90).translate(231.2, 197.6, 110), structuralSteelColor);
add('front-drum-hub--1', cylinder(63.232, 41.8, 10).rotateX(90).translate(231.2, -229.216, 110), structuralSteelColor);
add('front-drum-hub-1', cylinder(63.232, 41.8, 10).rotateX(90).translate(231.2, 229.216, 110), structuralSteelColor);
add('rear-drum', cylinder(395.2, 110, 12).rotateX(90).translate(-217.6, 197.6, 110), structuralSteelColor);
add('rear-drum-hub--1', cylinder(63.232, 41.8, 10).rotateX(90).translate(-217.6, -229.216, 110), structuralSteelColor);
add('rear-drum-hub-1', cylinder(63.232, 41.8, 10).rotateX(90).translate(-217.6, 229.216, 110), structuralSteelColor);
add('engine-cover', box(190.4, 234, 250, true).translate(108.8, 0, 535), equipmentPaintColor);
add('remote-control-mast', box(32, 35, 190, true).translate(0, 0, 505), structuralSteelColor);

return p.model();
