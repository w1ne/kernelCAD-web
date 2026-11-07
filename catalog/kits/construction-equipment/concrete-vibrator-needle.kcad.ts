// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly concrete vibrator and needle scene prop, modeled from scratch.
meta({
  name: "concrete-vibrator-needle",
  license: 'CC0-1.0',
  title: "Concrete vibrator and needle",
  description: "Portable concrete vibrator with motor case, flexible shaft and immersion head. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('concrete-vibrator-needle');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('motor-base', box(357, 173.6, 85, true).translate(0, 0, 42.5), body);
add('motor-case', box(306, 154, 189, true).translate(0, 0, 179.5), accent);
add('motor-shaft', cylinder(306, 48, 8).rotate([0, 1, 0], 90).translate(-153, 0, 155), body);
add('flexible-shaft', box(289, 28, 28, true).translate(272, 0, 140), accent);
add('vibrator-head', cylinder(190, 42, 8).rotate([0, 1, 0], 90).translate(416.5, 0, 126), body);

return p.model();
