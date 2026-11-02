// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly slab edge form system scene prop, modeled from scratch.
meta({
  name: "slab-edge-form",
  license: 'CC0-1.0',
  title: "Slab edge form system",
  description: "Straight slab edge form with steel stakes, brackets and adjustable clamps. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('slab-edge-form');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('edge-board', box(1450, 52, 291.2, true).translate(0, 0, 235.6), body);
add('stake-0', box(32, 156, 520, true).translate(-638, 0, 260), accent);
add('clamp-0', box(68, 161.2, 40, true).translate(-638, 0, 321.6), body);
add('stake-1', box(32, 156, 520, true).translate(-319, 0, 260), accent);
add('clamp-1', box(68, 161.2, 40, true).translate(-319, 0, 321.6), body);
add('stake-2', box(32, 156, 520, true).translate(0, 0, 260), accent);
add('clamp-2', box(68, 161.2, 40, true).translate(0, 0, 321.6), body);
add('stake-3', box(32, 156, 520, true).translate(319, 0, 260), accent);
add('clamp-3', box(68, 161.2, 40, true).translate(319, 0, 321.6), body);
add('stake-4', box(32, 156, 520, true).translate(638, 0, 260), accent);
add('clamp-4', box(68, 161.2, 40, true).translate(638, 0, 321.6), body);

return p.model();
