// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom tacky-mat tray scene prop, modeled from scratch.
meta({
  name: 'cleanroom-tacky-mat-tray',
  license: 'CC0-1.0',
  title: 'Cleanroom tacky-mat tray',
  description: 'Low entry tray with a raised perimeter, layered removable mat sheets and corner tabs. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('cleanroom-tacky-mat-tray');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('tray-base', box(900, 650, 55, true).translate(0, 0, 27.5), body);
add('replaceable-sheet-0', box(864, 624, 5, true).translate(0, 0, 57.5), accent);
add('replaceable-sheet-1', box(853.2, 616.2, 5, true).translate(0, 0, 63.5), body);
add('replaceable-sheet-2', box(842.4, 608.4, 5, true).translate(0, 0, 69.5), accent);
add('replaceable-sheet-3', box(831.6, 600.6, 5, true).translate(0, 0, 75.5), body);
add('corner-tab--396-0--273-0', box(42, 36, 18, true).translate(-396, -273, 88), accent);
add('corner-tab--396-0-273-0', box(42, 36, 18, true).translate(-396, 273, 88), accent);
add('corner-tab-396-0--273-0', box(42, 36, 18, true).translate(396, -273, 88), accent);
add('corner-tab-396-0-273-0', box(42, 36, 18, true).translate(396, 273, 88), accent);

return p.model();
