// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly center-pivot irrigation span scene prop, modeled from scratch.
meta({
  name: "center-pivot-irrigation-span",
  license: 'CC0-1.0',
  title: "Center-pivot irrigation span",
  description: "Modular irrigation truss with paired tower frames, drive wheels and a suspended spray line. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('center-pivot-irrigation-span');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('water-main', box(4400, 55, 55, true).translate(0, 0, 1236.5), accent);
add('truss-upper-chord', box(4400, 210, 28, true).translate(0, 0, 1471), body);
add('truss-lower-chord--1', box(4400, 30, 30, true).translate(0, -175, 1100), body);
add('truss-lower-chord-1', box(4400, 30, 30, true).translate(0, 175, 1100), body);
add('truss-web-0', box(28, 336, 372, true).translate(-1848, 0, 1441.5), accent);
add('sprinkler-drop-0', box(22, 22, 1007.5, true).translate(-1848, 0, 583.75), body);
add('sprinkler-head-0', cylinder(25, 36, 8).translate(-1848, 0, 55), accent);
add('truss-web-1', box(28, 336, 372, true).translate(-1232, 0, 1441.5), accent);
add('sprinkler-drop-1', box(22, 22, 1007.5, true).translate(-1232, 0, 583.75), body);
add('sprinkler-head-1', cylinder(25, 36, 8).translate(-1232, 0, 55), accent);
add('truss-web-2', box(28, 336, 372, true).translate(-616, 0, 1441.5), accent);
add('sprinkler-drop-2', box(22, 22, 1007.5, true).translate(-616, 0, 583.75), body);
add('sprinkler-head-2', cylinder(25, 36, 8).translate(-616, 0, 55), accent);
add('truss-web-3', box(28, 336, 372, true).translate(0, 0, 1441.5), accent);
add('sprinkler-drop-3', box(22, 22, 1007.5, true).translate(0, 0, 583.75), body);
add('sprinkler-head-3', cylinder(25, 36, 8).translate(0, 0, 55), accent);
add('truss-web-4', box(28, 336, 372, true).translate(616, 0, 1441.5), accent);
add('sprinkler-drop-4', box(22, 22, 1007.5, true).translate(616, 0, 583.75), body);
add('sprinkler-head-4', cylinder(25, 36, 8).translate(616, 0, 55), accent);
add('truss-web-5', box(28, 336, 372, true).translate(1232, 0, 1441.5), accent);
add('sprinkler-drop-5', box(22, 22, 1007.5, true).translate(1232, 0, 583.75), body);
add('sprinkler-head-5', cylinder(25, 36, 8).translate(1232, 0, 55), accent);
add('truss-web-6', box(28, 336, 372, true).translate(1848, 0, 1441.5), accent);
add('sprinkler-drop-6', box(22, 22, 1007.5, true).translate(1848, 0, 583.75), body);
add('sprinkler-head-6', cylinder(25, 36, 8).translate(1848, 0, 55), accent);
add('tower-leg-left--1', box(45, 45, 1116, true).translate(-1540, -126, 558), body);
add('tower-leg-right--1', box(45, 45, 1116, true).translate(-1540, 126, 558), body);
add('tower-wheel--1', cylinder(65, 72, 12).rotate([0, 1, 0], 90).translate(-1572.5, 0, 72), "#414848");
add('tower-wheel--1-hub', cylinder(71.5, 24.48, 10).translate(-1575.75, 0, 72), accent);
add('tower-leg-left-1', box(45, 45, 1116, true).translate(1540, -126, 558), body);
add('tower-leg-right-1', box(45, 45, 1116, true).translate(1540, 126, 558), body);
add('tower-wheel-1', cylinder(65, 72, 12).rotate([0, 1, 0], 90).translate(1507.5, 0, 72), "#414848");
add('tower-wheel-1-hub', cylinder(71.5, 24.48, 10).translate(1504.25, 0, 72), accent);

return p.model();
