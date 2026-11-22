// SPDX-License-Identifier: CC0-1.0
// Compaction roller with front and rear steel drums, operator canopy and central chassis.
meta({
  name: "tandem-vibratory-roller",
  license: 'CC0-1.0',
  title: "Tandem vibratory roller",
  description: "Compaction roller with front and rear steel drums, operator canopy and central chassis. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('tandem-vibratory-roller');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('roller-frame', box(714, 350, 180, true).translate(63, 0, 320), structuralSteelColor);
add('front-drum', cylinder(532, 180, 12).rotateX(90).translate(357, 266, 180), structuralSteelColor);
add('front-drum-hub--1', cylinder(85.12, 68.4, 10).rotateX(90).translate(357, -308.56, 180), structuralSteelColor);
add('front-drum-hub-1', cylinder(85.12, 68.4, 10).rotateX(90).translate(357, 308.56, 180), structuralSteelColor);
add('rear-drum', cylinder(532, 180, 12).rotateX(90).translate(-336, 266, 180), structuralSteelColor);
add('rear-drum-hub--1', cylinder(85.12, 68.4, 10).rotateX(90).translate(-336, -308.56, 180), structuralSteelColor);
add('rear-drum-hub-1', cylinder(85.12, 68.4, 10).rotateX(90).translate(-336, 308.56, 180), structuralSteelColor);
add('engine-cover', box(294, 315, 250, true).translate(168, 0, 535), equipmentPaintColor);
add('operator-platform', box(262.5, 266, 50, true).translate(-147, 0, 445), equipmentPaintColor);
add('canopy-posts', box(28, 224, 252, true).translate(-178.5, 0, 596), equipmentPaintColor);
add('canopy-roof', box(367.5, 308, 42, true).translate(-178.5, 0, 743), equipmentPaintColor);

return p.model();
