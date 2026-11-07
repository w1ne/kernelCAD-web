// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable core drill stand scene prop, modeled from scratch.
meta({
  name: "portable-core-drill-stand",
  license: 'CC0-1.0',
  title: "Portable core drill stand",
  description: "Anchored core-drilling rig with guide column, sliding carriage and base plate. Knobs: overall scale, body color and accent color.",
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
const p = assembly('portable-core-drill-stand');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('drill-base', box(486, 400, 55, true).translate(0, 0, 27.5), body);
add('guide-column', box(60, 60, 1049.6, true).translate(0, 0, 579.8), accent);
add('drill-carriage', box(172.8, 160, 200, true).translate(0, 0, 740), body);
add('core-bit', cylinder(435.2, 48, 10).translate(0, 0, 256), accent);
add('feed-handle', box(226.8, 35, 35, true).translate(-205.2, 0, 631.9), body);

return p.model();
