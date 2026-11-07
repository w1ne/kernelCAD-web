// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly solvent storage cabinet scene prop, modeled from scratch.
meta({
  name: 'solvent-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Solvent storage cabinet',
  description: 'Tall solvent cabinet with a vented crown, two compartments and visible door pulls. Knobs: overall scale, body color and accent color.',
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
const p = assembly('solvent-storage-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(750, 560, 1250, true).translate(0, 0, 625), body);
add('cabinet-plinth', box(690, 504, 22, true).translate(0, 0, 11), accent);
add('door-0', box(309.6, 18, 1220, true).translate(-165, -285.6, 1235), body);
add('door-pull-0', box(14, 14, 200, true).translate(-61.8, -308, 750), accent);
add('door-1', box(309.6, 18, 1220, true).translate(165, -285.6, 1235), body);
add('door-pull-1', box(14, 14, 200, true).translate(268.2, -308, 750), accent);
add('vent-slot-0', box(240, 10, 9, true).translate(0, -291.2, 979.5), accent);
add('vent-slot-1', box(240, 10, 9, true).translate(0, -291.2, 1005.5), accent);
add('vent-slot-2', box(240, 10, 9, true).translate(0, -291.2, 1031.5), accent);
add('vent-slot-3', box(240, 10, 9, true).translate(0, -291.2, 1057.5), accent);
add('vent-slot-4', box(240, 10, 9, true).translate(0, -291.2, 1083.5), accent);

return p.model();
