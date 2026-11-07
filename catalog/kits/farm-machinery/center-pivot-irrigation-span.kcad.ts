// SPDX-License-Identifier: CC0-1.0
// Modular irrigation truss with paired tower frames, drive wheels and a suspended spray line.
meta({
  name: "center-pivot-irrigation-span",
  license: 'CC0-1.0',
  title: "Center-pivot irrigation span",
  description: "Modular irrigation truss with paired tower frames, drive wheels and a suspended spray line. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad' },
});
const p = assembly('center-pivot-irrigation-span');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('water-main', box(4400, 55, 55, true).translate(0, 0, 1236.5), paintedSteelColor);
add('truss-upper-chord', box(4400, 210, 28, true).translate(0, 0, 1471), steelColor);
add('truss-lower-chord--1', box(4400, 30, 30, true).translate(0, -175, 1100), steelColor);
add('truss-lower-chord-1', box(4400, 30, 30, true).translate(0, 175, 1100), steelColor);
add('truss-web-0', box(28, 336, 372, true).translate(-1848, 0, 1441.5), steelColor);
add('sprinkler-drop-0', box(22, 22, 1007.5, true).translate(-1848, 0, 583.75), paintedSteelColor);
add('sprinkler-head-0', cylinder(25, 36, 8).translate(-1848, 0, 55), paintedSteelColor);
add('truss-web-1', box(28, 336, 372, true).translate(-1232, 0, 1441.5), steelColor);
add('sprinkler-drop-1', box(22, 22, 1007.5, true).translate(-1232, 0, 583.75), paintedSteelColor);
add('sprinkler-head-1', cylinder(25, 36, 8).translate(-1232, 0, 55), paintedSteelColor);
add('truss-web-2', box(28, 336, 372, true).translate(-616, 0, 1441.5), steelColor);
add('sprinkler-drop-2', box(22, 22, 1007.5, true).translate(-616, 0, 583.75), paintedSteelColor);
add('sprinkler-head-2', cylinder(25, 36, 8).translate(-616, 0, 55), paintedSteelColor);
add('truss-web-3', box(28, 336, 372, true).translate(0, 0, 1441.5), steelColor);
add('sprinkler-drop-3', box(22, 22, 1007.5, true).translate(0, 0, 583.75), paintedSteelColor);
add('sprinkler-head-3', cylinder(25, 36, 8).translate(0, 0, 55), paintedSteelColor);
add('truss-web-4', box(28, 336, 372, true).translate(616, 0, 1441.5), steelColor);
add('sprinkler-drop-4', box(22, 22, 1007.5, true).translate(616, 0, 583.75), paintedSteelColor);
add('sprinkler-head-4', cylinder(25, 36, 8).translate(616, 0, 55), paintedSteelColor);
add('truss-web-5', box(28, 336, 372, true).translate(1232, 0, 1441.5), steelColor);
add('sprinkler-drop-5', box(22, 22, 1007.5, true).translate(1232, 0, 583.75), paintedSteelColor);
add('sprinkler-head-5', cylinder(25, 36, 8).translate(1232, 0, 55), paintedSteelColor);
add('truss-web-6', box(28, 336, 372, true).translate(1848, 0, 1441.5), steelColor);
add('sprinkler-drop-6', box(22, 22, 1007.5, true).translate(1848, 0, 583.75), paintedSteelColor);
add('sprinkler-head-6', cylinder(25, 36, 8).translate(1848, 0, 55), paintedSteelColor);
add('tower-leg-left--1', box(45, 45, 1116, true).translate(-1540, -126, 558), paintedSteelColor);
add('tower-leg-right--1', box(45, 45, 1116, true).translate(-1540, 126, 558), paintedSteelColor);
add('tower-wheel--1', cylinder(65, 72, 12).rotate([0, 1, 0], 90).translate(-1572.5, 0, 72), rubberColor);
add('tower-wheel--1-hub', cylinder(71.5, 24.48, 10).translate(-1575.75, 0, 72), steelColor);
add('tower-leg-left-1', box(45, 45, 1116, true).translate(1540, -126, 558), paintedSteelColor);
add('tower-leg-right-1', box(45, 45, 1116, true).translate(1540, 126, 558), paintedSteelColor);
add('tower-wheel-1', cylinder(65, 72, 12).rotate([0, 1, 0], 90).translate(1507.5, 0, 72), rubberColor);
add('tower-wheel-1-hub', cylinder(71.5, 24.48, 10).translate(1504.25, 0, 72), steelColor);

return p.model();
