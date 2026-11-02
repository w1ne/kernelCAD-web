// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly construction personnel elevator scene prop, modeled from scratch.
meta({
  name: "construction-personnel-elevator",
  license: 'CC0-1.0',
  title: "Construction personnel elevator",
  description: "Temporary mast elevator cage with guide rails, mesh walls and ground frame. Knobs: overall scale, body color and accent color.",
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
const p = assembly('construction-personnel-elevator');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(639.6, 590.4, 90, true).translate(0, 0, 45), body);
add('mast--1', box(65, 68, 1848, true).translate(-265.2, 187.2, 1014), accent);
add('cross-brace--1', box(35, 40, 1512, true).translate(-265.2, -172.8, 896), body);
add('mast-1', box(65, 68, 1848, true).translate(265.2, 187.2, 1014), accent);
add('cross-brace-1', box(35, 40, 1512, true).translate(265.2, -172.8, 896), body);
add('elevator-platform', box(561.6, 460.8, 588, true).translate(0, 0, 544), body);
add('cage-side--1', box(38, 460.8, 882, true).translate(-288.6, 0, 691), accent);
add('cage-side-1', box(38, 460.8, 882, true).translate(288.6, 0, 691), accent);

return p.model();
