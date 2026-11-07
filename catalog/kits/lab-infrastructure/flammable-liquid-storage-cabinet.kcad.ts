// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly flammable-liquid storage cabinet scene prop, modeled from scratch.
meta({
  name: 'flammable-liquid-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Flammable-liquid storage cabinet',
  description: 'Double-door chemical storage cabinet with contrasting warning panel, vents and raised feet. Knobs: overall scale, body color and accent color.',
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
const p = assembly('flammable-liquid-storage-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(900, 600, 1100, true).translate(0, 0, 550), body);
add('cabinet-plinth', box(828, 540, 22, true).translate(0, 0, 11), accent);
add('door-0', box(371.52, 18, 1070, true).translate(-198, -306, 1085), accent);
add('door-pull-0', box(14, 14, 176, true).translate(-74.16, -330, 660), accent);
add('door-1', box(371.52, 18, 1070, true).translate(198, -306, 1085), accent);
add('door-pull-1', box(14, 14, 176, true).translate(321.84, -330, 660), accent);
add('vent-slot-0', box(288, 10, 9, true).translate(0, -312, 862.5), accent);
add('vent-slot-1', box(288, 10, 9, true).translate(0, -312, 888.5), accent);
add('vent-slot-2', box(288, 10, 9, true).translate(0, -312, 914.5), accent);
add('vent-slot-3', box(288, 10, 9, true).translate(0, -312, 940.5), accent);
add('vent-slot-4', box(288, 10, 9, true).translate(0, -312, 966.5), accent);
add('warning-band', box(828, 12, 50, true).translate(0, -318, 982), accent);

return p.model();
