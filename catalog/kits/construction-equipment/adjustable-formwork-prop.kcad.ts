// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly adjustable formwork prop scene prop, modeled from scratch.
meta({
  name: "adjustable-formwork-prop",
  license: 'CC0-1.0',
  title: "Adjustable formwork prop",
  description: "Telescoping floor support prop with top plate, screw collar and broad base plate. Knobs: overall scale, body color and accent color.",
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
const p = assembly('adjustable-formwork-prop');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-plate', box(324, 324, 35, true).translate(0, 0, 17.5), body);
add('outer-tube', cylinder(913.5, 64, 10).translate(0, 0, 35), accent);
add('inner-tube', cylinder(449.5, 45, 10).translate(0, 0, 913.5), body);
add('adjustment-collar', box(160, 150, 52, true).translate(0, 0, 896), accent);
add('head-plate', box(306, 306, 38, true).translate(0, 0, 1382), body);

return p.model();
