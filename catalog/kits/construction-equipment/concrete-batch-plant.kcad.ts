// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly compact concrete batch plant scene prop, modeled from scratch.
meta({
  name: "concrete-batch-plant",
  license: 'CC0-1.0',
  title: "Compact concrete batch plant",
  description: "Portable batch plant with aggregate bins, central mixer, cement silo and service ladder. Knobs: overall scale, body color and accent color.",
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
const p = assembly('concrete-batch-plant');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('aggregate-bin-0', box(352, 400, 779, true).translate(-544, -375, 389.5), body);
add('bin-top-rim-0', box(368, 425, 42, true).translate(-544, -375, 800), accent);
add('aggregate-bin-1', box(352, 400, 779, true).translate(0, -375, 389.5), body);
add('bin-top-rim-1', box(368, 425, 42, true).translate(0, -375, 800), accent);
add('aggregate-bin-2', box(352, 400, 779, true).translate(544, -375, 389.5), body);
add('bin-top-rim-2', box(368, 425, 42, true).translate(544, -375, 800), accent);
add('batch-frame', box(480, 325, 246, true).translate(0, 0, 902), accent);
add('mixer-drum', cylinder(55, 192, 12).translate(0, 0, 1066), body);
add('cement-silo', box(288, 250, 1558, true).translate(496, 350, 779), accent);
add('silo-roof', cylinder(55, 192, 10).translate(496, 350, 1558), body);
add('silo-leg--1', box(38, 38, 1271, true).translate(496, 250, 635.5), body);
add('silo-leg-1', box(38, 38, 1271, true).translate(496, 450, 635.5), body);
add('service-platform', box(384, 45, 164, true).translate(0, 487.5, 963.5), accent);

return p.model();
