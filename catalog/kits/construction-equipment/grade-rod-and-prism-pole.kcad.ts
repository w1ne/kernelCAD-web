// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly grade rod and prism pole scene prop, modeled from scratch.
meta({
  name: "grade-rod-and-prism-pole",
  license: 'CC0-1.0',
  title: "Grade rod and prism pole",
  description: "Survey rod assembly with graduated segments, target prism and clamp mount. Knobs: overall scale, body color and accent color.",
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
const p = assembly('grade-rod-and-prism-pole');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('rod-foot', box(108, 99, 42, true).translate(0, 0, 21), body);
add('survey-pole', cylinder(1540, 26, 8).translate(0, 0, 42), accent);
add('graduation-band-0', box(84, 22, 16, true).translate(0, -17.6, 103), body);
add('graduation-band-1', box(84, 22, 16, true).translate(0, -17.6, 269.25), body);
add('graduation-band-2', box(84, 22, 16, true).translate(0, -17.6, 435.5), body);
add('graduation-band-3', box(84, 22, 16, true).translate(0, -17.6, 601.75), body);
add('graduation-band-4', box(84, 22, 16, true).translate(0, -17.6, 768), body);
add('graduation-band-5', box(84, 22, 16, true).translate(0, -17.6, 934.25), body);
add('graduation-band-6', box(84, 22, 16, true).translate(0, -17.6, 1100.5), body);
add('graduation-band-7', box(84, 22, 16, true).translate(0, -17.6, 1266.75), body);
add('prism-bracket', box(156, 60, 54, true).translate(0, 0, 1514.5), body);
add('prism', cylinder(86, 70, 8).translate(0, 0, 1540), accent);

return p.model();
